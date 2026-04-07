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
  entryDate: string;               // ISO date string
  separationDate: string;          // ISO date string
  activeDuty: boolean;
  officerOrEnlisted: 'officer' | 'enlisted';
  dischargeLevel: number;          // 1-5
  completedFullTerm?: boolean;     // set for all periods
  disabilityDischarge?: boolean;   // set for all periods
}

interface QuestionnaireAnswers {
  servicePeriods: ServicePeriod[];
  serviceConnectedCondition: boolean | null;  // null = "I'm not sure"
  hasDisabilityRating: boolean | null;
  disabilityRating: number | null;            // 0-100 in increments of 10
  adaptiveHousingCondition: boolean;
  incomeBelowLimit: boolean;
  ageOrDisability: boolean;
  purpleHeartPost911: boolean;
}
```

### Eligibility Requirement Row (from database)

Matches the `eligibility_requirements` table schema:

```typescript
interface EligibilityRequirement {
  id: number;
  benefit_id: number;
  active_duty_service: boolean | null;
  service_connected_condition: boolean | null;
  min_discharge_level: number | null;          // 1-5
  min_disability_rating: number | null;        // sentinel value, see below
  adaptive_housing_condition: boolean | null;
  purple_heart: boolean | null;
  post_911_90_days: boolean | null;
  post_911_30_days: boolean | null;
  pension_service_req: boolean | null;
  income_below_limit: boolean | null;
  age_or_disability: boolean | null;
  min_continuous_days: number | null;          // minimum continuous days in a single service period
  service_disability_discharge: boolean | null; // period must have been discharged due to service-connected disability
  entry_before_date: string | null;            // ISO date string; period's entry date must be before this date
  home_loan_service_req: boolean | null;       // compound check; see Home Loan Service Requirement below
}
```

---

## Matching Logic

A benefit is eligible if **at least one service period passes both service-level checks** AND **all profile-level checks pass**.

### Service-Level Checks (evaluated per service period)

At least one service period must pass **all** of these:

1. **Active duty:** If the requirement's `active_duty_service` is `true`, the period's `activeDuty` must be `true`.
2. **Discharge level:** The period's `dischargeLevel` must be **≤** the requirement's `min_discharge_level`. Lower numbers represent better discharges (1 = Honorable, 5 = Dishonorable).
3. **Minimum continuous days:** If `min_continuous_days` is set, the duration of the period (separationDate − entryDate in days) must be ≥ this value.
4. **Service-connected disability discharge:** If `service_disability_discharge` is `true`, the period's `disabilityDischarge` must be `true`.
5. **Entry before date:** If `entry_before_date` is set, the period's `entryDate` must be strictly before this date.

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

4. **Purple Heart (post-9/11):**
   - `true`: the veteran's `purpleHeartPost911` must be `true`
   - `null`: skip this check

5. **Post-9/11 service — 90 days aggregate (`post_911_90_days`):**
   - `true`: the veteran must have accumulated ≥ 90 days of active duty service after September 11, 2001, across honorably discharged periods (discharge level 1)
   - `null`: skip this check

6. **Post-9/11 service — 30 days continuous (`post_911_30_days`):**
   - `true`: the veteran must have at least one honorably discharged active duty period with ≥ 30 days of service after September 11, 2001
   - `null`: skip this check

7. **Home loan service requirement (`home_loan_service_req`):**
   - `true`: the veteran must meet one of these three paths:
     - **Path 1 — Era-based active duty service:** at least one active duty period whose entry date falls within an era below, and whose duration meets that era's minimum:
       | Era | Entry date range | Minimum days | Notes |
       |---|---|---|---|
       | WWII | Sep 16 1940 – Jul 25 1947 | 90 | |
       | Post-WWII | Jul 26 1947 – Jun 26 1950 | 181 | |
       | Korean War | Jun 27 1950 – Jan 31 1955 | 90 | |
       | Post-Korean War | Feb 1 1955 – Aug 4 1964 | 181 | |
       | Vietnam War | Aug 5 1964 – May 7 1975 | 90 | |
       | Post-Vietnam | May 8 1975 – Sep 7 1980 (enlisted) or Oct 16 1981 (officers) | 181 | |
       | Transition | Sep 8 1980 – Aug 1 1990 (enlisted) or Oct 17 1981 – Aug 1 1990 (officers) | 730; drops to 181 if `completedFullTerm` is `true` | |
       | Gulf War | Aug 2 1990 – present | 730; drops to 90 if `completedFullTerm` is `true` | |
     - **Path 2 — Disability discharge:** any active duty period has `disabilityDischarge === true`
     - **Path 3 — Reserve/National Guard:** total days across all non-active-duty periods ≥ 2190 (approx. 6 years), and at least one of those periods has `dischargeLevel === 1` (Honorable)
   - `null`: skip this check

8. **Pension service requirement (`pension_service_req`):**
   - `true`: the veteran must meet one of these wartime service paths:
     - **Path A**: any active period started before September 8, 1980, with ≥ 90 total active duty days and wartime overlap
     - **Path B**: any enlisted active period started on or after September 8, 1980, with ≥ 730 total active duty days and wartime overlap
     - **Path C**: any officer period started on or after October 17, 1981, where prior active duty days (before that officer period's entry date) total < 730
   - `null`: skip this check
   - Wartime periods: WWII (Dec 7 1941–Dec 31 1946), Korean War (Jun 27 1950–Jan 31 1955), Vietnam (Nov 1 1955–May 7 1975), Gulf War (Aug 2 1990–present)

9. **Income below limit:**
   - `true`: the veteran's `incomeBelowLimit` must be `true`
   - `null`: skip this check

10. **Age or disability:**
    - `true`: the veteran's `ageOrDisability` must be `true`
    - `null`: skip this check

---

## Current Eligibility Requirements Data

For reference, these are the current benefits and their requirements:

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

| benefit_id | Benefit | active_duty_service | service_connected_condition | min_discharge_level | min_disability_rating | adaptive_housing_condition | purple_heart | post_911_90_days | post_911_30_days | pension_service_req | home_loan_service_req | income_below_limit | age_or_disability | min_continuous_days | service_disability_discharge | entry_before_date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Disability Compensation | true | true | 2 | -1 | null | null | null | null | null | null | null | null | null | null | null |
| 2 | VR&E | true | true | 2 | 10 | null | null | null | null | null | null | null | null | null | null | null |
| 3 | Adaptive Housing Grants | true | true | 2 | null | true | null | null | null | null | null | null | null | null | null | null |
| 4 | Post 9/11 GI Bill (path 1: 90 days aggregate) | null | null | null | null | null | null | true | null | null | null | null | null | null | null | null |
| 4 | Post 9/11 GI Bill (path 2: Purple Heart) | null | null | 1 | null | null | true | null | null | null | null | null | null | null | null | null |
| 4 | Post 9/11 GI Bill (path 3: 30 days + service-connected) | null | true | null | null | null | null | null | true | null | null | null | null | null | null | null |
| 5 | Veterans Pension | null | null | 4 | null | null | null | null | null | true | null | true | true | null | null | null |
| 6 | VA Health Care (path 1: ≥730 continuous days) | true | null | 4 | null | null | null | null | null | null | null | null | null | 730 | null | null |
| 6 | VA Health Care (path 2: disability discharge) | true | null | 4 | null | null | null | null | null | null | null | null | null | null | true | null |
| 6 | VA Health Care (path 3: entry before 1980-09-07) | true | null | 4 | null | null | null | null | null | null | null | null | null | null | null | 1980-09-07 |
| 7 | VA Home Loan Guaranty | null | null | 4 | null | null | null | null | null | null | true | null | null | null | null | null |

---

## Integration with index.ts

In the POST `/questionnaire` route:

1. Query `SELECT * FROM eligibility_requirements`
2. Pass the query results and `req.body` to the eligibility function to get matching benefit IDs
3. Fetch the full benefit records for those IDs: `SELECT id, name, category, short_description, description, eligibility_summary, url FROM benefits WHERE id = ANY($1)`
4. Return the matching benefits in the response: `{ eligibleBenefits: Benefit[] }`