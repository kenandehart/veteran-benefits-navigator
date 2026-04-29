// server/tests/test-va-home-loan.ts
//
// Test suite for VA Home Loan Guaranty (benefit ID 7) eligibility logic.
// Tests run through the public checkEligibility entry point and assert
// only on presence/absence of ID 7 in the matched array. Other benefits in
// the result are intentionally ignored — this file's job is to characterize
// the Home Loan rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/housing-assistance/home-loans/eligibility/
//
// Era-specific minimum active-duty service requirements (any one path
// satisfies the corresponding era):
//   * Gulf War (Aug 2, 1990 – present):
//       - 24 continuous months, OR
//       - full period called (≥90 days), OR
//       - ≥90 days with qualifying exception (hardship/early out), OR
//       - <90 days with disability discharge
//   * Sept 8, 1980 – Aug 1, 1990:
//       - 24 continuous months, OR
//       - full period called (≥181 days), OR
//       - ≥181 days with qualifying exception, OR
//       - <181 days with disability discharge
//   * Post-Vietnam (May 8, 1975 – Sept 7, 1980):
//       - 181 continuous days, OR
//       - <181 days with disability discharge
//
// Project principle: discharge stricter than General (OTH, Bad Conduct,
// Dishonorable) excludes per the false-hope principle, consistent with how
// Disability Compensation, Veterans Pension, VR&E, Adaptive Housing, and
// VA Health Care are gated.
//
// The 6-year National Guard/Reserve service path is documented on VA.gov
// but is not exercised by this suite (see follow-up note in the project's
// tech-debt thread).
//
// Run with: npx tsx --test server/tests/test-va-home-loan.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const VA_HOME_LOAN_ID = 7;

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
// active-duty enlisted period of 4 years, Gulf War era (post-Aug-2-1990
// entry). Easily clears any era's duration rule on length alone, so cases
// that probe specific era rules or waiver flags override the dates and
// flags as needed.
const BASELINE_PERIOD: ServicePeriod = {
  entryDate: '2010-01-01',
  separationDate: '2014-01-01',
  activeDuty: true,
  officerOrEnlisted: 'enlisted',
  dischargeLevel: 1,
  disabilityDischarge: false,
  completedFullTerm: true,
  hardshipOrEarlyOut: false,
};

const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [BASELINE_PERIOD],
  serviceConnectedCondition: false,
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
  // ---------- Qualifying ----------

  {
    description: 'Honorable discharge with 4 years active duty 2010-2014 qualifies (Gulf War era)',
    answers: {},
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge with exactly 24 continuous months post-1990 qualifies (minimum threshold)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2012-01-01',
      }],
    },
    shouldMatch: true,
  },
  {
    description: 'General discharge with 4 years active duty post-1990 qualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 2 }],
    },
    shouldMatch: true,
  },
  {
    // Full-period completion satisfies the Gulf War era rule when the
    // veteran has at least 90 days of active duty.
    description: 'Honorable discharge with 100 days active duty post-1990 and completedFullTerm true qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2010-04-11',
        completedFullTerm: true,
      }],
    },
    shouldMatch: true,
  },
  {
    // Disability discharge waives the day minimum entirely (path: <90 days
    // with disability discharge).
    description: 'Honorable discharge with 60 days active duty post-1990 and disabilityDischarge true qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2010-03-02',
        completedFullTerm: false,
        disabilityDischarge: true,
      }],
    },
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge with 24 months active duty 1985-1987 qualifies (1980-1990 era)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1985-01-01',
        separationDate: '1987-01-01',
      }],
    },
    shouldMatch: true,
  },
  {
    // Probing case for the era-specific minimum: post-Vietnam veterans
    // (entry between May 8, 1975 and Sept 7, 1980) need 181 continuous
    // days, not the 90-day Gulf War minimum.
    description: 'Honorable discharge with 181 continuous days active duty 1976 qualifies (post-Vietnam era 181-day rule)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1976-01-01',
        separationDate: '1976-06-30',
      }],
    },
    shouldMatch: true,
  },

  // ---------- Duration / service-status exclusions ----------

  {
    description: 'Honorable discharge with 60 days active duty post-1990 and no exceptions disqualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2010-03-02',
        completedFullTerm: false,
      }],
    },
    shouldMatch: false,
  },
  {
    // Probing case for the era-specific minimum: 100 days does not satisfy
    // the post-Vietnam 181-day rule even though it would satisfy the Gulf
    // War 90-day rule. Era of entry, not absolute length, decides.
    description: 'Honorable discharge with 100 days active duty 1976 disqualifies (fails post-Vietnam era 181-day minimum)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1976-01-01',
        separationDate: '1976-04-10',
        completedFullTerm: false,
      }],
    },
    shouldMatch: false,
  },
  {
    description: 'No active duty service disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, activeDuty: false }],
    },
    shouldMatch: false,
  },

  // ---------- Discharge exclusions ----------

  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'OTH discharge with 4 years active duty disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 3 }],
    },
    shouldMatch: false,
  },
  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'Bad Conduct discharge with 4 years active duty disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 4 }],
    },
    shouldMatch: false,
  },
  {
    description: 'Dishonorable discharge with 4 years active duty disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 5 }],
    },
    shouldMatch: false,
  },
];

describe('VA Home Loan Guaranty', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(VA_HOME_LOAN_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${VA_HOME_LOAN_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
