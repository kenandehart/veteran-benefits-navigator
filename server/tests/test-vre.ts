// server/tests/test-vre.ts
//
// Test suite for Veteran Readiness and Employment / VR&E (benefit ID 2)
// eligibility logic. Tests run through the public checkEligibility entry
// point and assert only on presence/absence of ID 2 in the matched array.
// Other benefits in the result are intentionally ignored — this file's job
// is to characterize the VR&E rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/careers-employment/vocational-rehabilitation/eligibility
//
// Veteran-path eligibility (per VA.gov):
//   * Discharge other than dishonorable
//   * VA service-connected disability rating of at least 10%
//
// Project principle: discharge stricter than General (i.e., OTH, Bad
// Conduct, Dishonorable) excludes, consistent with how Disability
// Compensation and Veterans Pension are gated. This is the "false hope is
// harmful" principle applied uniformly.
//
// Run with: npx tsx --test server/tests/test-vre.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const VRE_ID = 2;

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
// active-duty enlisted period of moderate length.
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

// Baseline answers represent a "minimum eligible veteran" for VR&E: one
// Honorable active-duty period and a 10% VA service-connected rating (the
// minimum that satisfies the rule). Cases override only the field(s) they
// probe.
const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [HONORABLE_ACTIVE_DUTY],
  serviceConnectedCondition: true,
  hasDisabilityRating: true,
  disabilityRating: 10,
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
  // ---------- Qualifying ----------

  {
    description: 'Honorable discharge with 10% rating qualifies (minimum)',
    answers: {},
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge with 30% rating qualifies',
    answers: { disabilityRating: 30 },
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge with 100% rating qualifies',
    answers: { disabilityRating: 100 },
    shouldMatch: true,
  },
  {
    description: 'General discharge with 20% rating qualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 2 }],
      disabilityRating: 20,
    },
    shouldMatch: true,
  },
  // paidAtTotalDisabilityRate is a TDIU-style flag (rated lower than 100%
  // but compensated at the 100% rate). It should not disqualify VR&E — the
  // veteran still has a 10%+ rating, which is the only rating-side gate.
  {
    description: '70% rating paid at total disability rate qualifies',
    answers: { disabilityRating: 70, paidAtTotalDisabilityRate: true },
    shouldMatch: true,
  },

  // ---------- Rating exclusions ----------

  {
    description: 'No disability rating disqualifies',
    answers: { hasDisabilityRating: false, disabilityRating: null },
    shouldMatch: false,
  },
  {
    // 0% is a real VA rating (service-connected but non-compensable) and
    // should not satisfy the 10% gate. Reflects design intent.
    description: '0% disability rating disqualifies (below 10% minimum)',
    answers: { hasDisabilityRating: true, disabilityRating: 0 },
    shouldMatch: false,
  },
  {
    // VR&E requires an actual VA rating, not just a believed-service-connected
    // condition. Reflects design intent.
    description: 'Service-connected condition claimed but no VA rating disqualifies',
    answers: {
      serviceConnectedCondition: true,
      hasDisabilityRating: false,
      disabilityRating: null,
    },
    shouldMatch: false,
  },

  // ---------- Discharge exclusions ----------

  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'Other Than Honorable discharge with 30% rating disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 3 }],
      disabilityRating: 30,
    },
    shouldMatch: false,
  },
  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'Bad Conduct discharge with 50% rating disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 4 }],
      disabilityRating: 50,
    },
    shouldMatch: false,
  },
  {
    description: 'Dishonorable discharge with 100% rating disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 5 }],
      disabilityRating: 100,
    },
    shouldMatch: false,
  },
];

describe('Veteran Readiness and Employment (VR&E)', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(VRE_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${VRE_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
