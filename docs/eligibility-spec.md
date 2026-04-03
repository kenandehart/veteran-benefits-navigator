# Eligibility Matching Specification

## Overview

Create `eligibility.ts` in the same directory as `index.ts`. This module exports a function that checks questionnaire answers against eligibility requirements from the database and returns the benefit IDs the veteran qualifies for.

Then update the POST `/questionnaire` route in `index.ts` to query the `eligibility_requirements` table, pass the results along with the request body to this function, and return the matching benefit IDs in the response. Remove the `console.log` statement.

---

## Function Signature

The function accepts two arguments:

1. The questionnaire answers submitted by the frontend
2. An array of eligibility requirement rows from the `eligibility_requirements` database table

It returns an array of `benefit_id` numbers the veteran qualifies for.

---

## Types

### Questionnaire Answers (from frontend)

```typescript
interface ServicePeriod {
  entryDate: string;       // ISO date string
  separationDate: string;  // ISO date string
  activeDuty: boolean;
  dischargeLevel: number;  // 1-5
}

interface QuestionnaireAnswers {
  servicePeriods: ServicePeriod[];
  serviceConnectedCondition: boolean | null;  // null = "I'm not sure"
  hasDisabilityRating: boolean | null;
  disabilityRating: number | null;            // 0-100 in increments of 10
  adaptiveHousingCondition: boolean;
}
```

### Eligibility Requirement Row (from database)

Matches the `eligibility_requirements` table schema:

```typescript
interface EligibilityRequirement {
  id: number;
  benefit_id: number;
  active_duty_service: boolean;
  service_connected_condition: boolean;
  min_discharge_level: number;             // 1-5
  min_disability_rating: number | null;    // sentinel value, see below
  adaptive_housing_condition: boolean | null;
}
```

---

## Matching Logic

A benefit is eligible if **at least one service period passes both service-level checks** AND **all profile-level checks pass**.

### Service-Level Checks (evaluated per service period)

At least one service period must pass **both** of these:

1. **Active duty:** If the requirement's `active_duty_service` is `true`, the period's `activeDuty` must be `true`.
2. **Discharge level:** The period's `dischargeLevel` must be **≤** the requirement's `min_discharge_level`. Lower numbers represent better discharges (1 = Honorable, 5 = Dishonorable).

### Profile-Level Checks (evaluated once against the overall answers)

All applicable checks must pass:

1. **Service-connected condition:** If the requirement's `service_connected_condition` is `true`, the veteran's `serviceConnectedCondition` must be `true` or `null`. A `null` value means the veteran answered "I'm not sure," which should still pass this check.

2. **Disability rating** — uses a sentinel value pattern:

   ```
   /*
    * min_disability_rating values:
    * -1         — veteran must NOT have a disability rating (hasDisabilityRating must be false)
    * null       — no rating requirement, skip this check entirely
    * 0 to 100   — veteran must have a rating >= this value
    */
   ```

   - `-1`: `hasDisabilityRating` must be `false`
   - `null`: skip this check
   - `0–100`: `disabilityRating` must be ≥ this value

3. **Adaptive housing condition:**
   - `true`: the veteran's `adaptiveHousingCondition` must be `true`
   - `null`: skip this check

---

## Current Eligibility Requirements Data

For reference, these are the three benefits and their requirements:

```
/*
 * Discharge Levels:
 * 1 — Honorable
 * 2 — General (Under Honorable Conditions)
 * 3 — Other Than Honorable
 * 4 — Bad Conduct
 * 5 — Dishonorable
 *
 * min_disability_rating values:
 * -1    — veteran must NOT have a disability rating
 * null  — no rating requirement, skip check
 * 0-100 — veteran must have a rating >= this value
 */
```

| benefit_id | Benefit | active_duty_service | service_connected_condition | min_discharge_level | min_disability_rating | adaptive_housing_condition |
|---|---|---|---|---|---|---|
| 7 | Disability Compensation | true | true | 2 | -1 | null |
| 8 | VR&E | true | true | 2 | 10 | null |
| 9 | Adaptive Housing Grants | true | true | 2 | null | true |

---

## Integration with index.ts

In the POST `/questionnaire` route:

1. Query `SELECT * FROM eligibility_requirements`
2. Pass the query results and `req.body` to the eligibility function
3. Return the matching benefit IDs in the response: `{ eligibleBenefitIds: number[] }`
4. Remove the existing `console.log` statement