// server/tests/test-disability-compensation.ts
//
// Test suite for Disability Compensation (benefit ID 1) eligibility logic.
// Tests run through the public checkEligibility entry point and assert only
// on presence/absence of ID 1 in the matched array. Other benefits in the
// result are intentionally ignored — this file's job is to characterize the
// disability compensation rule in isolation.
//
// Source of truth for the rules: https://www.va.gov/disability/eligibility/
//
// Run with: npx tsx --test server/tests/test-disability-compensation.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const DISABILITY_COMPENSATION_ID = 1;

// ---------------------------------------------------------------------------
// Type definitions — mirrored from eligibility.ts (interfaces are not exported
// from the module, so they are redeclared here for type safety in the test
// fixtures).
// ---------------------------------------------------------------------------

interface ServicePeriod {
  entryDate: string;
  separationDate: string;
  activeDuty: boolean;
  officerOrEnlisted: 'officer' | 'enlisted';
  dischargeLevel: number;
  disabilityDischarge: boolean;
  completedFullTerm: boolean;
  hardshipOrEarlyOut: boolean;
}

interface QuestionnaireAnswers {
  servicePeriods: ServicePeriod[];
  serviceConnectedCondition: boolean | null;
  hasDisabilityRating: boolean | null;
  disabilityRating: number | null;
  adaptiveHousingCondition: boolean;
  hasAutoGrantCondition: boolean;
  incomeBelowLimit: boolean;
  ageOrDisability: boolean;
  purpleHeartPost911: boolean;
  hadSGLI: boolean;
  currentlyInVRE: boolean;
  paidAtTotalDisabilityRate: boolean;
  formerPOW: boolean;
  servedInVietnam: boolean;
}

// "Minimum eligible veteran" baseline service period: one Honorable
// active-duty enlisted period of moderate length, no disability discharge.
const HONORABLE_ACTIVE_DUTY: ServicePeriod = {
  entryDate: '2010-01-01',
  separationDate: '2014-01-01',
  activeDuty: true,
  officerOrEnlisted: 'enlisted',
  dischargeLevel: 1,
  disabilityDischarge: false,
  completedFullTerm: true,
  hardshipOrEarlyOut: false,
};

// Baseline answers represent a "minimum eligible veteran" for disability
// compensation: one Honorable active-duty period, service-connected condition
// reported, no existing rating, every other boolean false. Cases override
// only the field(s) they probe.
const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [HONORABLE_ACTIVE_DUTY],
  serviceConnectedCondition: true,
  hasDisabilityRating: false,
  disabilityRating: null,
  adaptiveHousingCondition: false,
  hasAutoGrantCondition: false,
  incomeBelowLimit: false,
  ageOrDisability: false,
  purpleHeartPost911: false,
  hadSGLI: false,
  currentlyInVRE: false,
  paidAtTotalDisabilityRate: false,
  formerPOW: false,
  servedInVietnam: false,
};

function buildAnswers(overrides: Partial<QuestionnaireAnswers> = {}): QuestionnaireAnswers {
  return { ...DEFAULT_ANSWERS, ...overrides };
}

interface TestCase {
  description: string;
  answers: Partial<QuestionnaireAnswers>;
  shouldMatch: boolean;
}

const cases: TestCase[] = [
  // ---------- Baseline passes ----------

  {
    description: '1. Honorable active-duty + service-connected + no rating',
    answers: {},
    shouldMatch: true,
  },
  {
    description: '2. General (Under Honorable) active-duty period',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 2 }],
    },
    shouldMatch: true,
  },
  {
    description: "3. Service-connected answer is \"I'm not sure\" (null)",
    answers: { serviceConnectedCondition: null },
    shouldMatch: true,
  },

  // ---------- Discharge exclusions ----------

  {
    description: '4. Other Than Honorable discharge (level 3)',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 3 }],
    },
    shouldMatch: false,
  },
  {
    description: '5. Bad Conduct discharge (level 4)',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 4 }],
    },
    shouldMatch: false,
  },
  {
    description: '6. Dishonorable discharge (level 5)',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 5 }],
    },
    shouldMatch: false,
  },

  // ---------- Service-connection exclusion ----------

  {
    description: '7. serviceConnectedCondition = false',
    answers: { serviceConnectedCondition: false },
    shouldMatch: false,
  },

  // ---------- Already-rated exclusion ("show only unused benefits" rule) ----------

  {
    description: '8. hasDisabilityRating=true, rating=0 (already rated, non-compensable)',
    answers: { hasDisabilityRating: true, disabilityRating: 0 },
    shouldMatch: false,
  },
  {
    description: '9. hasDisabilityRating=true, rating=50',
    answers: { hasDisabilityRating: true, disabilityRating: 50 },
    shouldMatch: false,
  },
  {
    description: '10. hasDisabilityRating=true, rating=100',
    answers: { hasDisabilityRating: true, disabilityRating: 100 },
    shouldMatch: false,
  },

  // ---------- Multi-period ----------

  {
    description: '11. Two periods: Honorable + Dishonorable (any qualifying period suffices)',
    answers: {
      servicePeriods: [
        { ...HONORABLE_ACTIVE_DUTY },
        { ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 5 },
      ],
    },
    shouldMatch: true,
  },
  {
    description: '12. Two periods: both Dishonorable',
    answers: {
      servicePeriods: [
        { ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 5 },
        { ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 5 },
      ],
    },
    shouldMatch: false,
  },

  // ---------- Active-duty status ----------
  //
  // Cases 13 and 14 probe a contested interpretation. The expected values
  // reflect the application's design intent (per the questionnaire's service-
  // periods step: Reservists/Guardsmen enter each activation as a separate
  // active-duty period, so a non-active-duty-only history should not match
  // disability compensation). This is NOT a literal reading of VA policy —
  // 38 CFR §3.6 recognizes service-connected conditions for some inactive-
  // duty training scenarios. The intent here is "did the user ever have a
  // qualifying period of federal active service," not the full VA rule.

  {
    description: '13. Single Honorable period, activeDuty=false, no other periods',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, activeDuty: false }],
    },
    shouldMatch: false,
  },
  {
    description: '14. Reservist activation: one Honorable non-active + one Honorable active-duty',
    answers: {
      servicePeriods: [
        { ...HONORABLE_ACTIVE_DUTY, activeDuty: false },
        { ...HONORABLE_ACTIVE_DUTY },
      ],
    },
    shouldMatch: true,
  },

  // ---------- Cross-cutting edge cases ----------

  {
    description: '15. Discharged for service-connected disability (disabilityDischarge=true)',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, disabilityDischarge: true }],
    },
    shouldMatch: true,
  },
  {
    description: '16. Former POW, otherwise baseline',
    answers: { formerPOW: true },
    shouldMatch: true,
  },
];

describe('Disability Compensation', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(DISABILITY_COMPENSATION_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${DISABILITY_COMPENSATION_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
