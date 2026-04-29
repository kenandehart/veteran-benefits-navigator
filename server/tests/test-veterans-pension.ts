// server/tests/test-veterans-pension.ts
//
// Test suite for Veterans Pension (benefit ID 5) eligibility logic.
// Tests run through the public checkEligibility entry point and assert only
// on presence/absence of ID 5 in the matched array. Other benefits in the
// result are intentionally ignored — this file's job is to characterize the
// pension rule in isolation.
//
// Source of truth for the rules: https://www.va.gov/pension/eligibility/
//
// Run with: npx tsx --test server/tests/test-veterans-pension.ts
//
// Note: the project uses Node's built-in test runner (node:test). The
// describe/test API is the same shape Jest and Vitest use; only the import
// and assertion library differ.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility } from '../src/eligibility';

const VETERANS_PENSION_ID = 5;

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

// "Minimum eligible wartime veteran" baseline: a Vietnam-era in-country
// enlisted veteran with a ~180-day Honorable active-duty period, financial
// and age conditions met. Cases override only the field(s) they probe.
const BASELINE_PERIOD: ServicePeriod = {
  entryDate: '1968-06-01',
  separationDate: '1968-12-01',
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
  incomeBelowLimit: true,
  ageOrDisability: true,
  purpleHeartPost911: false,
  hadSGLI: false,
  currentlyInVRE: false,
  paidAtTotalDisabilityRate: false,
  formerPOW: false,
  servedInVietnam: true,
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
    description: '1. Pre-1980 entry, 90+ days, Vietnam-era in-country, Honorable, financial+age met',
    answers: {},
    shouldMatch: true,
  },
  {
    description: '2. Post-1980 enlisted, 24+ months, Gulf War wartime, Honorable',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1991-01-01',
        separationDate: '1993-06-01',
      }],
      servedInVietnam: false,
    },
    shouldMatch: true,
  },
  {
    description: '3. Post-1981 officer, single period, Gulf War',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1991-01-01',
        separationDate: '1993-06-01',
        officerOrEnlisted: 'officer',
      }],
      servedInVietnam: false,
    },
    shouldMatch: true,
  },

  // ---------- Discharge exclusions ----------

  {
    description: '4. Other Than Honorable discharge (level 3)',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 3 }],
    },
    shouldMatch: false,
  },
  {
    description: '5. Bad Conduct discharge (level 4)',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 4 }],
    },
    shouldMatch: false,
  },
  {
    description: '6. Dishonorable discharge (level 5)',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, dischargeLevel: 5 }],
    },
    shouldMatch: false,
  },

  // ---------- Wartime period exclusions ----------

  {
    description: '7. Pre-1980 entry, 90+ days, but service entirely between wartimes (1957)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1957-01-01',
        separationDate: '1957-06-01',
      }],
      servedInVietnam: false,
    },
    shouldMatch: false,
  },
  {
    description: '8. Post-1980 enlisted, 24+ months, but service entirely between wartimes (1985-1987)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1985-01-01',
        separationDate: '1987-06-01',
      }],
      servedInVietnam: false,
    },
    shouldMatch: false,
  },
  {
    description: '9. Service overlaps Vietnam wartime end (1974-1976), servedInVietnam=false',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1974-01-01',
        separationDate: '1976-01-01',
      }],
      servedInVietnam: false,
    },
    shouldMatch: true,
  },

  // ---------- Service-length exclusions ----------

  {
    description: '10. Pre-1980 entry, only 60 days',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1968-06-01',
        separationDate: '1968-08-01',
      }],
    },
    shouldMatch: false,
  },
  {
    description: '11. Post-1980 enlisted, 18 months, did NOT complete full term',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1991-01-01',
        separationDate: '1992-07-01',
        completedFullTerm: false,
      }],
      servedInVietnam: false,
    },
    shouldMatch: false,
  },
  // Case 12 probes the "full period for which you were called" exception:
  // a post-1980 veteran who served less than 24 months can still qualify if
  // they completed the full term they were ordered to serve (e.g., a shorter
  // contract that the veteran fulfilled). Without this exception, only the
  // 730-day minimum would apply.
  {
    description: '12. Post-1980 enlisted, 18 months, completed full term',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1991-01-01',
        separationDate: '1992-07-01',
        completedFullTerm: true,
      }],
      servedInVietnam: false,
    },
    shouldMatch: true,
  },

  // ---------- Active-duty status ----------

  {
    description: '13. Otherwise baseline, but activeDuty=false',
    answers: {
      servicePeriods: [{ ...BASELINE_PERIOD, activeDuty: false }],
    },
    shouldMatch: false,
  },

  // ---------- Financial / age requirements ----------

  {
    description: '14. Otherwise baseline, incomeBelowLimit=false',
    answers: { incomeBelowLimit: false },
    shouldMatch: false,
  },
  {
    description: '15. Otherwise baseline, ageOrDisability=false',
    answers: { ageOrDisability: false },
    shouldMatch: false,
  },
  {
    description: '16. Otherwise baseline, both financial and age conditions failed',
    answers: { incomeBelowLimit: false, ageOrDisability: false },
    shouldMatch: false,
  },

  // ---------- Officer rule ----------
  //
  // Cases 17 and 18 probe officer-rule interpretation. VA's documented
  // post-1980 minimum-service rule (which applies to officers from
  // 1981-10-17) is "24 months OR full period for which called." Some
  // readings layer on a "did not previously complete 24 months of active
  // duty" disqualifier for the post-1981 officer path; whether the
  // application enforces that is what case 17 probes. Case 18 probes how a
  // service period that straddles the 1981-10-16 officer cutoff is handled
  // — neither the pre-cutoff 90-day rule nor the post-cutoff 730-day rule
  // applies cleanly when the entry date is between 1980-09-08 and
  // 1981-10-16 for an officer. Expected values reflect a strict reading;
  // failures here are findings to discuss, not bugs to fix without product
  // input.

  {
    description: '17. Post-1981 officer with prior 30+-month enlisted active-duty period',
    answers: {
      servicePeriods: [
        {
          ...BASELINE_PERIOD,
          entryDate: '1985-01-01',
          separationDate: '1987-08-01',
          officerOrEnlisted: 'enlisted',
        },
        {
          ...BASELINE_PERIOD,
          entryDate: '1991-01-01',
          separationDate: '1993-06-01',
          officerOrEnlisted: 'officer',
        },
      ],
      servedInVietnam: false,
    },
    shouldMatch: false,
  },
  {
    description: '18. Officer started 1980-06-01 (straddles the 1981-10-16 officer cutoff)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1980-06-01',
        separationDate: '1982-06-01',
        officerOrEnlisted: 'officer',
      }],
      servedInVietnam: false,
    },
    shouldMatch: false,
  },

  // ---------- Vietnam-era wartime nuance ----------
  //
  // Cases 19 and 20 probe whether eligibility.ts differentiates the Vietnam
  // wartime window by `servedInVietnam`. Per VA.gov, the Vietnam wartime
  // window is 1961-02-28 to 1975-05-07 for veterans who served in-country,
  // and 1964-08-05 to 1975-05-07 for everyone else. A 1956 period would
  // therefore qualify only for in-country veterans. If the code uses a
  // single window without consulting `servedInVietnam`, both cases will
  // return the same result.

  {
    description: '19. 1962 period (inside in-country-only band), servedInVietnam=true → qualifies',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1962-01-01',
        separationDate: '1962-06-01',
      }],
      servedInVietnam: true,
    },
    shouldMatch: true,
  },
  {
    description: '20. 1956 period, servedInVietnam=false (outside-Vietnam window starts 1964-08-05)',
    answers: {
      servicePeriods: [{
        ...BASELINE_PERIOD,
        entryDate: '1956-01-01',
        separationDate: '1956-06-01',
      }],
      servedInVietnam: false,
    },
    shouldMatch: false,
  },
];

describe('Veterans Pension', () => {
  for (const c of cases) {
    test(c.description, () => {
      const matched = checkEligibility(buildAnswers(c.answers));
      const present = matched.includes(VETERANS_PENSION_ID);
      assert.strictEqual(
        present,
        c.shouldMatch,
        `Expected benefit ID ${VETERANS_PENSION_ID} to ${c.shouldMatch ? 'be' : 'NOT be'} present. Matched IDs: [${matched.join(', ')}]`,
      );
    });
  }
});
