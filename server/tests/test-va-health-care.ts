// server/tests/test-va-health-care.ts
//
// Test suite for VA Health Care (benefit ID 6) eligibility logic. Tests
// run through the public checkEligibility entry point and assert only on
// presence/absence of ID 6 in the matched array. Other benefits in the
// result are intentionally ignored — this file's job is to characterize the
// VA Health Care rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/health-care/eligibility/
//
// Base requirement: served on active duty AND discharge other than
// dishonorable.
//
// Service-duration rule: veterans who enlisted on or after September 8,
// 1980 must have served 24 continuous months on active duty OR completed
// the full period for which they were called to active duty. Exceptions
// (any one waives the duration rule):
//   * Discharged for a service-connected disability (disabilityDischarge)
//   * Discharged for hardship or early out (hardshipOrEarlyOut)
//   * Began service before September 8, 1980
//
// Project principle: discharge stricter than General (OTH, Bad Conduct,
// Dishonorable) excludes per the false-hope principle, consistent with how
// Disability Compensation, Veterans Pension, VR&E, and Adaptive Housing
// are gated. The VA.gov seed text says "discharge other than dishonorable"
// but the codebase pattern is Honorable/General only — these tests reflect
// that pattern.
//
// Run with: npx tsx --test server/tests/test-va-health-care.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const VA_HEALTH_CARE_ID = 6;

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
// active-duty enlisted period of 4 years, post-1980 entry, with the full
// term completed. Easily clears the 24-month duration rule on length alone,
// so cases that probe the duration rule or its exceptions override the
// dates and waiver flags as needed.
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
    description: 'Honorable discharge with 4 years active duty post-1980 entry qualifies',
    answers: {},
    shouldMatch: true,
  },
  {
    description: 'General discharge with exactly 24 months active duty qualifies (minimum threshold)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2012-01-01',
        dischargeLevel: 2,
      }],
    },
    shouldMatch: true,
  },
  {
    // Full-term completion waives the 24-month rule (per VA.gov: "24
    // continuous months on active duty OR completed the full period for
    // which they were called").
    description: 'Honorable discharge with 18 months active duty and completedFullTerm true qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2011-07-01',
        completedFullTerm: true,
      }],
    },
    shouldMatch: true,
  },
  {
    // Disability discharge waives the 24-month rule.
    description: 'Honorable discharge with 12 months and disabilityDischarge true qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2011-01-01',
        completedFullTerm: false,
        disabilityDischarge: true,
      }],
    },
    shouldMatch: true,
  },
  {
    // Hardship / early-out waives the 24-month rule.
    description: 'Honorable discharge with 12 months and hardshipOrEarlyOut true qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2011-01-01',
        completedFullTerm: false,
        hardshipOrEarlyOut: true,
      }],
    },
    shouldMatch: true,
  },
  {
    // Pre-September 8, 1980 entry waives the 24-month rule (the rule
    // applies only to enlistments on/after that date).
    description: 'Honorable discharge with pre-1980 entry and 18 months service qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1975-06-01',
        separationDate: '1976-12-01',
        completedFullTerm: false,
      }],
    },
    shouldMatch: true,
  },

  // ---------- Duration / service-status exclusions ----------

  {
    description: 'Honorable discharge with 18 months active duty and no exceptions disqualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2011-07-01',
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

describe('VA Health Care', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(VA_HEALTH_CARE_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${VA_HEALTH_CARE_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
