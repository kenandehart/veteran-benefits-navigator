// server/tests/test-adaptive-housing.ts
//
// Test suite for Adaptive Housing Grants (benefit ID 3) eligibility logic.
// Tests run through the public checkEligibility entry point and assert only
// on presence/absence of ID 3 in the matched array. Other benefits in the
// result are intentionally ignored — this file's job is to characterize the
// adaptive housing rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/housing-assistance/disability-housing-grants/
//
// Adaptive Housing Grants is an umbrella over three programs (SAH, SHA, TRA).
// Eligibility requires a qualifying service-connected condition. Qualifying
// conditions per 38 CFR 3.809 include loss/loss of use of more than one
// limb, loss/loss of use of both hands, blindness in both eyes (20/200 or
// less), severe burns, certain respiratory or breathing injuries, certain
// post-9/11 lower extremity loss, and neurological conditions such as ALS.
// The questionnaire abstracts that condition list into the single boolean
// `adaptiveHousingCondition`. There is no rating-percentage threshold beyond
// service connection itself — a 0% rating still establishes service
// connection.
//
// Project principle: discharge stricter than General (OTH, Bad Conduct,
// Dishonorable) excludes per the false-hope principle, consistent with how
// Disability Compensation, Veterans Pension, and VR&E are gated.
//
// Run with: npx tsx --test server/tests/test-adaptive-housing.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const ADAPTIVE_HOUSING_ID = 3;

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

// Baseline answers represent a "minimum eligible veteran" for an Adaptive
// Housing Grant: one Honorable active-duty period, a qualifying adaptive
// housing condition, and a 100% VA service-connected rating (typical of
// the SAH cohort). Cases override only the field(s) they probe.
const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [HONORABLE_ACTIVE_DUTY],
  serviceConnectedCondition: true,
  hasDisabilityRating: true,
  disabilityRating: 100,
  adaptiveHousingCondition: true,
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
    description: 'Honorable discharge with adaptive housing condition and 100% rating qualifies',
    answers: {},
    shouldMatch: true,
  },
  {
    description: 'General discharge with adaptive housing condition and 30% rating qualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 2 }],
      disabilityRating: 30,
    },
    shouldMatch: true,
  },
  {
    description: 'Adaptive housing condition with 10% rating qualifies (no rating-percentage threshold)',
    answers: { disabilityRating: 10 },
    shouldMatch: true,
  },
  {
    // 0% is a real VA rating that establishes service connection
    // (service-connected but non-compensable). Reflects design intent.
    description: 'Adaptive housing condition with 0% rating qualifies (service connection established)',
    answers: { hasDisabilityRating: true, disabilityRating: 0 },
    shouldMatch: true,
  },
  {
    // TDIU/total-rating compensation should not disqualify — the gate is
    // service connection plus a qualifying condition, not the compensation
    // mechanism.
    description: 'Adaptive housing condition with paidAtTotalDisabilityRate true qualifies',
    answers: { paidAtTotalDisabilityRate: true },
    shouldMatch: true,
  },

  // ---------- Condition / service-connection exclusions ----------

  {
    description: 'No adaptive housing condition disqualifies (qualifying condition required)',
    answers: { adaptiveHousingCondition: false },
    shouldMatch: false,
  },
  {
    description: 'No service connection at all disqualifies',
    answers: {
      adaptiveHousingCondition: false,
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
    description: 'OTH discharge with adaptive housing condition disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 3 }],
    },
    shouldMatch: false,
  },
  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'Bad Conduct discharge with adaptive housing condition disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 4 }],
    },
    shouldMatch: false,
  },
  {
    description: 'Dishonorable discharge with adaptive housing condition disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 5 }],
    },
    shouldMatch: false,
  },
];

describe('Adaptive Housing Grants', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(ADAPTIVE_HOUSING_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${ADAPTIVE_HOUSING_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
