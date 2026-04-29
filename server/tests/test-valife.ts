// server/tests/test-valife.ts
//
// Test suite for VALife (benefit ID 10) eligibility logic. Tests run
// through the public checkEligibility entry point and assert only on
// presence/absence of ID 10 in the matched array. Other benefits in the
// result are intentionally ignored — this file's job is to characterize
// the VALife rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/life-insurance/options-eligibility/valife/
//
// Eligibility (under-81 path, the only path the questionnaire currently
// models): the veteran has a VA service-connected disability rating of any
// percentage, including 0%. There is no time limit to apply for veterans
// under 81.
//
// Project principle: discharge stricter than General (OTH, Bad Conduct,
// Dishonorable) excludes per the false-hope principle, consistent with all
// other benefits in this codebase.
//
// The age-81+ VALife path (apply for disability comp before 81, receive
// rating after 81, apply for VALife within 2 years) is documented on
// VA.gov but is not exercised by this suite — the QuestionnaireAnswers
// schema does not expose age or date-of-birth, so the path is not currently
// representable.
//
// Run with: npx tsx --test server/tests/test-valife.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const VALIFE_ID = 10;

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

// Baseline answers represent a "minimum eligible veteran" for VALife: one
// Honorable active-duty period and a 100% VA service-connected rating
// (the simplest qualifying rating). Cases override only the field(s) they
// probe.
const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [HONORABLE_ACTIVE_DUTY],
  serviceConnectedCondition: true,
  hasDisabilityRating: true,
  disabilityRating: 100,
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
    description: 'Honorable discharge with 100% rating qualifies',
    answers: {},
    shouldMatch: true,
  },
  {
    // VA.gov explicitly states 0% rating qualifies — any rating, including
    // a non-compensable 0%, establishes the service connection that VALife
    // requires. Reflects design intent.
    description: 'Honorable discharge with 0% rating qualifies (any rating including 0% establishes service connection)',
    answers: { hasDisabilityRating: true, disabilityRating: 0 },
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge with 10% rating qualifies',
    answers: { disabilityRating: 10 },
    shouldMatch: true,
  },
  {
    description: 'General discharge with 30% rating qualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 2 }],
      disabilityRating: 30,
    },
    shouldMatch: true,
  },
  {
    // TDIU/total-rating compensation should not disqualify — the gate is
    // "has a service-connected rating," not the compensation mechanism.
    description: 'Honorable discharge with 50% rating and paidAtTotalDisabilityRate true qualifies',
    answers: { disabilityRating: 50, paidAtTotalDisabilityRate: true },
    shouldMatch: true,
  },

  // ---------- Rating exclusions ----------

  {
    description: 'No disability rating disqualifies (rating required, not just service)',
    answers: { hasDisabilityRating: false, disabilityRating: null },
    shouldMatch: false,
  },
  {
    // VALife requires an actual VA rating, not just a believed-
    // service-connected condition. Reflects design intent.
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
    description: 'OTH discharge with 50% rating disqualifies',
    answers: {
      servicePeriods: [{ ...HONORABLE_ACTIVE_DUTY, dischargeLevel: 3 }],
      disabilityRating: 50,
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
    },
    shouldMatch: false,
  },
];

describe('VALife', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(VALIFE_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${VALIFE_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
