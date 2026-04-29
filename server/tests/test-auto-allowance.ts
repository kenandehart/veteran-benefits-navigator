// server/tests/test-auto-allowance.ts
//
// Test suite for Automobile Allowance and Adaptive Equipment (benefit ID 9)
// eligibility logic. Tests run through the public checkEligibility entry
// point and assert only on presence/absence of ID 9 in the matched array.
// Other benefits in the result are intentionally ignored — this file's job
// is to characterize the auto-allowance rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/disability/eligibility/special-claims/automobile-allowance-adaptive-equipment/
//
// Eligibility requires a service-connected disability that includes at
// least one qualifying condition: loss/loss of use of feet or hands, severe
// vision impairment in both eyes, severe burns, ALS, or ankylosis of knees
// or hips. The questionnaire abstracts that condition list into the single
// boolean `hasAutoGrantCondition`. There is no rating-percentage threshold
// beyond service connection itself — a 0% rating still establishes service
// connection.
//
// Project principle: discharge stricter than General (OTH, Bad Conduct,
// Dishonorable) excludes per the false-hope principle, consistent with how
// all other benefits in this codebase are now gated.
//
// Run with: npx tsx --test server/tests/test-auto-allowance.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const AUTO_ALLOWANCE_ID = 9;

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

// Baseline answers represent a "minimum eligible veteran" for the
// Automobile Allowance: one Honorable active-duty period, a qualifying
// auto-grant condition, and a 100% VA service-connected rating (typical of
// the cohort that needs adaptive auto equipment). Cases override only the
// field(s) they probe.
const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [HONORABLE_ACTIVE_DUTY],
  serviceConnectedCondition: true,
  hasDisabilityRating: true,
  disabilityRating: 100,
  adaptiveHousingCondition: false,
  hasAutoGrantCondition: true,
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
    description: 'Honorable discharge with auto grant condition and 100% rating qualifies',
    answers: {},
    shouldMatch: true,
  },
  {
    description: 'General discharge with auto grant condition and 30% rating qualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 2 }],
      disabilityRating: 30,
    },
    shouldMatch: true,
  },
  {
    description: 'Auto grant condition with 10% rating qualifies (no rating-percentage threshold)',
    answers: { disabilityRating: 10 },
    shouldMatch: true,
  },
  {
    // 0% is a real VA rating that establishes service connection
    // (service-connected but non-compensable). Reflects design intent.
    description: 'Auto grant condition with 0% rating qualifies (service connection established)',
    answers: { hasDisabilityRating: true, disabilityRating: 0 },
    shouldMatch: true,
  },
  {
    // TDIU/total-rating compensation should not disqualify — the gate is
    // service connection plus a qualifying condition, not the compensation
    // mechanism.
    description: 'Auto grant condition with paidAtTotalDisabilityRate true qualifies',
    answers: { paidAtTotalDisabilityRate: true },
    shouldMatch: true,
  },

  // ---------- Condition / service-connection exclusions ----------

  {
    description: 'No auto grant condition disqualifies (qualifying condition required)',
    answers: { hasAutoGrantCondition: false },
    shouldMatch: false,
  },
  {
    description: 'No service connection at all disqualifies',
    answers: {
      hasAutoGrantCondition: false,
      hasDisabilityRating: false,
      disabilityRating: null,
      serviceConnectedCondition: false,
    },
    shouldMatch: false,
  },

  // ---------- Discharge exclusions ----------

  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'OTH discharge with auto grant condition disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 3 }],
    },
    shouldMatch: false,
  },
  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'Bad Conduct discharge with auto grant condition disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 4 }],
    },
    shouldMatch: false,
  },
  {
    description: 'Dishonorable discharge with auto grant condition disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 5 }],
    },
    shouldMatch: false,
  },
];

describe('Automobile Allowance and Adaptive Equipment', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(AUTO_ALLOWANCE_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${AUTO_ALLOWANCE_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
