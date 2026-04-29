// server/tests/test-dental-eligibility.ts
//
// Test suite for VA Dental Care (benefit ID 11) eligibility logic.
// Tests run through the public checkEligibility entry point and assert only
// on presence/absence of ID 11 in the matched array. Other benefits in the
// result are intentionally ignored — this file's job is to characterize the
// dental rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/health-care/about-va-health-benefits/dental-care/
//
// Run with: npx tsx --test server/tests/test-dental-eligibility.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.
//
// Note: the recent-separation path in eligibility.ts uses a 180-day window
// anchored to the actual current date at runtime. Cases that probe that path
// were written assuming "today" is around 2026-04-29; re-anchor those test
// dates if running far from that date.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const VA_DENTAL_CARE_ID = 11;

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

// Baseline service period: passes the outer non-dishonorable gate but is far
// enough in the past that it does not trigger the recent-discharge path on
// its own, so each case can probe its qualifying path in isolation.
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

// Cases 4a/4b/4c probe the recent-discharge path, which uses a 180-day window
// anchored to the actual current date at runtime. Hard-coded dates would
// drift in and out of the window over time, so those cases derive their
// entry/separation dates from "today" via daysAgo(). Returns a UTC midnight
// YYYY-MM-DD string N days before today, matching the date format eligibility.ts
// expects.
function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

interface TestCase {
  description: string;
  answers: Partial<QuestionnaireAnswers>;
  shouldMatch: boolean;
}

const cases: TestCase[] = [
  // ---------- Qualifying paths (each probed in isolation) ----------

  {
    description: '1. Former POW',
    answers: { formerPOW: true },
    shouldMatch: true,
  },
  {
    description: '2. Paid at 100% / TDIU rate',
    answers: { paidAtTotalDisabilityRate: true },
    shouldMatch: true,
  },
  {
    description: '3. Currently participating in VR&E',
    answers: { currentlyInVRE: true },
    shouldMatch: true,
  },
  // Cases 4a/4b/4c exercise the recent-discharge path with dynamic dates
  // (see daysAgo() above). Each case sets a ~120-day Honorable active-duty
  // period whose separation date is N days before today; only the recency
  // of separation differs between cases.
  {
    description: '4a. Recent-discharge path: separation 30 days ago, 120-day period',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: daysAgo(150),
        separationDate: daysAgo(30),
      }],
    },
    shouldMatch: true,
  },
  {
    description: '4b. Recent-discharge path: separation 179 days ago (just inside 180-day window)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: daysAgo(299),
        separationDate: daysAgo(179),
      }],
    },
    shouldMatch: true,
  },
  {
    description: '4c. Recent-discharge path: separation 181 days ago (just outside 180-day window)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: daysAgo(301),
        separationDate: daysAgo(181),
      }],
    },
    shouldMatch: false,
  },
  // Case 5 (service-connected dental condition path) was here. It has been
  // removed because eligibility.ts cannot distinguish a dental
  // service-connected condition from a generic one — the questionnaire
  // collects only `serviceConnectedCondition` as a single boolean covering
  // any service-connected condition. The seed text was updated in this
  // session to drop this path, bringing it in line with what the code
  // surfaces. To re-introduce the path, a new questionnaire question is
  // needed; see docs/tech-debt.md item #1 ("Service-connected dental
  // condition question") for the scope.

  // ---------- Non-qualifying ----------

  {
    description: '6. Post-Gulf-War period under 90 days, no other qualifying flags',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2026-02-01',
        separationDate: '2026-03-15',
        completedFullTerm: false,
      }],
    },
    shouldMatch: false,
  },
  // Case 7 probes the 90-day threshold boundary (60 days < 90).
  // Note: the 1992 dates also fall outside the 180-day recency window, so
  // the recent-discharge path would block on either check independently.
  {
    description: '7. Persian Gulf War era period, only 60 days',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1992-01-01',
        separationDate: '1992-03-01',
        completedFullTerm: false,
      }],
    },
    shouldMatch: false,
  },
  // Case 8 probes the Persian Gulf War era boundary (federal law sets the
  // start at 1990-08-02). A 90+ day active-duty period entirely before that
  // date should not match the recent-discharge path.
  {
    description: '8. 90+ days active duty, but pre-Gulf-War era',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1980-01-01',
        separationDate: '1980-06-01',
      }],
    },
    shouldMatch: false,
  },
  {
    description: '9. Persian Gulf War 90+ days but Dishonorable discharge',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1991-01-01',
        separationDate: '1991-05-01',
        dischargeLevel: 5,
      }],
    },
    shouldMatch: false,
  },
  {
    description: '10. Persian Gulf War 90+ days but not active duty',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1991-01-01',
        separationDate: '1991-05-01',
        activeDuty: false,
      }],
    },
    shouldMatch: false,
  },

  // ---------- Cross-cutting ----------

  {
    description: '11. Multiple qualifying paths (POW + 100% + VR&E)',
    answers: {
      formerPOW: true,
      paidAtTotalDisabilityRate: true,
      currentlyInVRE: true,
    },
    shouldMatch: true,
  },
  {
    description: '12. Persian Gulf 90+ active duty AND former POW',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: daysAgo(150),
        separationDate: daysAgo(30),
      }],
      formerPOW: true,
    },
    shouldMatch: true,
  },
];

describe('VA Dental Care', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(VA_DENTAL_CARE_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${VA_DENTAL_CARE_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
