// server/tests/test-dental-eligibility.ts
// Run with: npx tsx server/tests/test-dental-eligibility.ts
//
// Test suite for VA Dental Care (benefit ID 11) eligibility logic.
// Tests run through the public checkEligibility entry point and assert
// presence/absence of ID 11 in the matched array.
//
// Note: tests assume "today" is 2026-04-22 (the date the suite was authored).
// The 180-day window for Path D is anchored to the actual current date at
// runtime, so re-anchor Path D test dates if running far from this date.

import { checkEligibility } from '../src/eligibility';

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
  servedInVietnam: boolean;
  currentlyInVRE: boolean;
  formerPOW: boolean;
  paidAtTotalDisabilityRate: boolean;
}

const DENTAL_ID = 11;

// Safe falsy defaults for every field. Each test overrides only the fields
// it cares about, so the default object stays the single source of truth
// for "what does an empty answers object look like".
const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  servicePeriods: [],
  serviceConnectedCondition: null,
  hasDisabilityRating: null,
  disabilityRating: null,
  adaptiveHousingCondition: false,
  hasAutoGrantCondition: false,
  incomeBelowLimit: false,
  ageOrDisability: false,
  purpleHeartPost911: false,
  hadSGLI: false,
  servedInVietnam: false,
  currentlyInVRE: false,
  formerPOW: false,
  paidAtTotalDisabilityRate: false,
};

interface TestCase {
  name: string;
  expected: boolean;
  overrides: Partial<QuestionnaireAnswers>;
}

const tests: TestCase[] = [
  // -------------------------------------------------------------------------
  // PATH PASSES — one positive case per eligibility path
  // -------------------------------------------------------------------------

  {
    name: 'TEST 1 — Path A pass: Former POW with qualifying service',
    expected: true,
    overrides: {
      servicePeriods: [{
        entryDate: '1968-03-01',
        separationDate: '1971-03-01',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
      formerPOW: true,
    },
  },

  {
    name: 'TEST 2 — Path B pass: Single 100% / TDIU',
    expected: true,
    overrides: {
      servicePeriods: [{
        entryDate: '2008-06-01',
        separationDate: '2014-06-01',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
      paidAtTotalDisabilityRate: true,
    },
  },

  {
    name: 'TEST 3 — Path C pass: Currently participating in VR&E',
    expected: true,
    overrides: {
      servicePeriods: [{
        entryDate: '2010-01-01',
        separationDate: '2018-01-01',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
      currentlyInVRE: true,
    },
  },

  {
    name: 'TEST 4 — Path D pass: Recent GWOT-era separation, >90 days active',
    expected: true,
    overrides: {
      servicePeriods: [{
        entryDate: '2025-07-01',
        separationDate: '2026-01-15',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
    },
  },

  {
    name: 'TEST 5 — Path D pass via completedFullTerm: short tour, recent',
    expected: true,
    overrides: {
      servicePeriods: [{
        entryDate: '2026-01-01',
        separationDate: '2026-02-28',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
    },
  },

  // -------------------------------------------------------------------------
  // PATH FAILURES — boundary and disqualifier cases
  // -------------------------------------------------------------------------

  {
    // Critical regression: catches the Math.abs bug where a future-dated
    // separation (e.g., user mistype) would incorrectly pass the 180-day
    // window check. Must be false.
    name: 'TEST 6 — Path D fail: separation date in the future',
    expected: false,
    overrides: {
      servicePeriods: [{
        entryDate: '2025-06-01',
        separationDate: '2026-08-01',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
    },
  },

  {
    name: 'TEST 7 — Path D fail: separation more than 180 days ago',
    expected: false,
    overrides: {
      servicePeriods: [{
        entryDate: '2020-01-01',
        separationDate: '2025-06-01',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
    },
  },

  {
    name: 'TEST 8 — Path D fail: <90 days AND not completedFullTerm',
    expected: false,
    overrides: {
      servicePeriods: [{
        entryDate: '2026-02-01',
        separationDate: '2026-03-15',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: false,
        hardshipOrEarlyOut: false,
      }],
    },
  },

  {
    name: 'TEST 9 — Path D fail: reserve service, not active duty',
    expected: false,
    overrides: {
      servicePeriods: [{
        entryDate: '2025-07-01',
        separationDate: '2026-01-15',
        activeDuty: false,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 1,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
    },
  },

  // -------------------------------------------------------------------------
  // OUTER GATE — discharge and service requirements
  // -------------------------------------------------------------------------

  {
    // All four happy-path booleans fire simultaneously. The only thing
    // standing in the way is the outer discharge gate. Catches accidental
    // refactors that move the gate inside an individual path branch.
    name: 'TEST 10 — Outer gate fail: dishonorable discharge blocks all paths',
    expected: false,
    overrides: {
      servicePeriods: [{
        entryDate: '2010-01-01',
        separationDate: '2014-01-01',
        activeDuty: true,
        officerOrEnlisted: 'enlisted',
        dischargeLevel: 5,
        disabilityDischarge: false,
        completedFullTerm: true,
        hardshipOrEarlyOut: false,
      }],
      formerPOW: true,
      paidAtTotalDisabilityRate: true,
      currentlyInVRE: true,
    },
  },

  {
    name: 'TEST 11 — Outer gate fail: no service periods at all',
    expected: false,
    overrides: {
      servicePeriods: [],
      formerPOW: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

console.log(`Running ${tests.length} dental eligibility tests...\n`);

for (const test of tests) {
  const answers: QuestionnaireAnswers = { ...DEFAULT_ANSWERS, ...test.overrides };
  const matched = checkEligibility(answers);
  const actual = matched.includes(DENTAL_ID);

  if (actual === test.expected) {
    console.log(`  PASS  ${test.name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${test.name}`);
    console.log(`        Expected dental match: ${test.expected}`);
    console.log(`        Actual dental match:   ${actual}`);
    console.log(`        Full matched IDs:      [${matched.join(', ')}]`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);