// server/tests/test-post-911-gi-bill.ts
//
// Test suite for Post-9/11 GI Bill (benefit ID 4) eligibility logic. Tests
// run through the public checkEligibility entry point and assert only on
// presence/absence of ID 4 in the matched array. Other benefits in the
// result are intentionally ignored — this file's job is to characterize the
// Post-9/11 GI Bill rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/education/about-gi-bill-benefits/post-9-11/
//
// Three qualifying paths (any one suffices):
//   Path A: ≥90 days active duty on or after September 11, 2001
//   Path B: Purple Heart on or after Sept 11, 2001 AND honorably discharged
//           after any amount of service
//   Path C: ≥30 continuous days on or after Sept 11, 2001 AND honorably
//           discharged with a service-connected disability
//
// Project principle: per the seed text and 38 USC §3311, GI Bill is gated
// at Honorable only — stricter than the other benefits in this app, which
// allow Honorable or General. The seed explicitly says "honorable
// discharge" without the "or general" caveat that other benefits use.
// Anything stricter than Honorable is excluded per the false-hope principle.
//
// Run with: npx tsx --test server/tests/test-post-911-gi-bill.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const POST_911_GI_BILL_ID = 4;

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

// "Path A minimum" baseline service period: Honorable active-duty enlistment
// fully post-9/11 with just over 90 days of service. Cases override
// entryDate/separationDate or dischargeLevel as needed to probe other paths
// or the discharge gate.
const BASELINE_PERIOD: ServicePeriod = {
  entryDate: '2002-01-01',
  separationDate: '2002-04-15',
  activeDuty: true,
  officerOrEnlisted: 'enlisted',
  dischargeLevel: 1,
  disabilityDischarge: false,
  completedFullTerm: true,
  hardshipOrEarlyOut: false,
};

// Baseline answers represent a "minimum eligible veteran" for Post-9/11 GI
// Bill via Path A: one Honorable active-duty period of ~105 days entirely
// after 9/11/2001. All other top-level flags are off so each case can probe
// its target path in isolation.
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
    description: 'Honorable discharge with 90 days active duty post-9/11 qualifies (Path A minimum)',
    answers: {},
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge with 4 years active duty post-9/11 qualifies (Path A)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2014-01-01',
      }],
    },
    shouldMatch: true,
  },
  {
    // Path B has no minimum service length beyond the Purple Heart
    // requirement — 30 days of post-9/11 service plus a Purple Heart and an
    // Honorable discharge is enough.
    description: 'Honorable discharge with Purple Heart post-9/11 and short service qualifies (Path B)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2002-01-01',
        separationDate: '2002-01-31',
      }],
      purpleHeartPost911: true,
    },
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge with disability discharge after 30+ continuous days post-9/11 qualifies (Path C)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2010-03-01',
        disabilityDischarge: true,
      }],
    },
    shouldMatch: true,
  },
  {
    description: 'Service spanning pre-9/11 with 90+ days post-9/11 qualifies (Path A)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2000-01-01',
        separationDate: '2002-06-30',
      }],
    },
    shouldMatch: true,
  },

  // ---------- Service-window / path exclusions ----------

  {
    description: 'Service entirely before 9/11/2001 disqualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1995-01-01',
        separationDate: '2000-12-31',
      }],
    },
    shouldMatch: false,
  },
  {
    description: 'Less than 90 days post-9/11 with no Purple Heart and no disability discharge disqualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2002-01-01',
        separationDate: '2002-03-02',
      }],
    },
    shouldMatch: false,
  },

  // ---------- Discharge exclusions ----------

  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'OTH discharge with 4 years post-9/11 service disqualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2014-01-01',
        dischargeLevel: 3,
      }],
    },
    shouldMatch: false,
  },
  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'Bad Conduct discharge with Purple Heart disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 4 }],
      purpleHeartPost911: true,
    },
    shouldMatch: false,
  },
  {
    description: 'Dishonorable discharge with disability discharge disqualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2010-03-01',
        dischargeLevel: 5,
        disabilityDischarge: true,
      }],
    },
    shouldMatch: false,
  },
  {
    // Probing case reflecting design intent: GI Bill is stricter than the
    // other benefits in this app. The seed text says "honorable discharge"
    // specifically (not "honorable or general"), and 38 USC §3311 requires
    // honorable service. A General discharge satisfies the gate for
    // Disability Compensation, Pension, VR&E, and Adaptive Housing — but
    // not for the GI Bill.
    description: 'General discharge with 4 years post-9/11 service disqualifies (GI Bill requires Honorable, stricter than other benefits)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2010-01-01',
        separationDate: '2014-01-01',
        dischargeLevel: 2,
      }],
    },
    shouldMatch: false,
  },
];

describe('Post-9/11 GI Bill', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(POST_911_GI_BILL_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${POST_911_GI_BILL_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
