// server/tests/test-vgli.ts
//
// Test suite for Veterans' Group Life Insurance / VGLI (benefit ID 8)
// eligibility logic. Tests run through the public checkEligibility entry
// point and assert only on presence/absence of ID 8 in the matched array.
// Other benefits in the result are intentionally ignored — this file's job
// is to characterize the VGLI rule in isolation.
//
// Source of truth for the rules:
// https://www.va.gov/life-insurance/options-eligibility/vgli/
//
// Path 1 (the only path the questionnaire/seed currently models): had SGLI
// in service AND within 1 year and 120 days (485 days) of separation from
// an active-duty period of 31+ days.
//
// Project principle: discharge stricter than General (OTH, Bad Conduct,
// Dishonorable) excludes per the false-hope principle, consistent with all
// other benefits with discharge gating in this codebase.
//
// Time-sensitivity note: VGLI eligibility depends on the current date vs.
// separation date (485-day window). Cases were written assuming "today" is
// around 2026-04-29 and use dates with a comfortable margin from that
// anchor — separations 4–9 months in the past for "within window" cases
// and separations 2+ years in the past for "outside window" cases. If this
// test starts to drift toward the 485-day boundary in the future
// (separation dates approaching ~485 days before the actual run date), the
// fixture dates will need to be re-anchored.
//
// Run with: npx tsx --test server/tests/test-vgli.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const VGLI_ID = 8;

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
// active-duty enlisted period of ~4 years, separation in early 2026 — well
// inside the 485-day VGLI conversion window relative to a ~2026-04-29 run
// date, with margin for the test to remain valid for at least another year.
const BASELINE_PERIOD: ServicePeriod = {
  entryDate: '2022-01-01',
  separationDate: '2026-01-01',
  activeDuty: true,
  officerOrEnlisted: 'enlisted',
  dischargeLevel: 1,
  disabilityDischarge: false,
  completedFullTerm: true,
  hardshipOrEarlyOut: false,
};

// Baseline answers represent a "minimum eligible veteran" for VGLI: one
// Honorable active-duty period >31 days separating recently, with SGLI
// coverage during service. Cases override only the field(s) they probe.
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
  hadSGLI: true,
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
    description: 'Honorable discharge, had SGLI, separation 2026-01-01 qualifies (within 485-day window)',
    answers: {},
    shouldMatch: true,
  },
  {
    description: 'Honorable discharge, had SGLI, separation 2025-08-01 qualifies (within window, mid-range)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2021-08-01',
        separationDate: '2025-08-01',
      }],
    },
    shouldMatch: true,
  },
  {
    description: 'General discharge, had SGLI, separation 2025-12-01 qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2021-12-01',
        separationDate: '2025-12-01',
        dischargeLevel: 2,
      }],
    },
    shouldMatch: true,
  },

  // ---------- Window / SGLI exclusions ----------

  {
    description: 'Honorable discharge, had SGLI, separation 2018-01-01 disqualifies (well outside window)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2014-01-01',
        separationDate: '2018-01-01',
      }],
    },
    shouldMatch: false,
  },
  {
    description: 'Honorable discharge, had SGLI, separation 2024-06-01 disqualifies (outside 485-day window)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '2020-06-01',
        separationDate: '2024-06-01',
      }],
    },
    shouldMatch: false,
  },
  {
    // VGLI is a conversion benefit and requires having had SGLI coverage
    // during service — there is no path that creates VGLI eligibility for
    // a veteran who never carried SGLI.
    description: 'Honorable discharge, did NOT have SGLI, recent separation disqualifies',
    answers: { hadSGLI: false },
    shouldMatch: false,
  },

  // ---------- Discharge exclusions ----------

  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'OTH discharge, had SGLI, recent separation disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 3 }],
    },
    shouldMatch: false,
  },
  {
    // Excluded per false-hope principle; veteran would need a discharge
    // upgrade or Character of Discharge review first.
    description: 'Bad Conduct discharge, had SGLI, recent separation disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 4 }],
    },
    shouldMatch: false,
  },
  {
    description: 'Dishonorable discharge, had SGLI, recent separation disqualifies',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 5 }],
    },
    shouldMatch: false,
  },
];

describe("Veterans' Group Life Insurance (VGLI)", () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(VGLI_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${VGLI_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
