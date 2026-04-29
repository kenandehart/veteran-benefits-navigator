# Questionnaire Specification

This document is a complete reference for the veteran benefits questionnaire as
implemented today. It is intended for a reader who has never seen the code and
needs to understand the flow well enough to redesign it.

The canonical type definitions live in `server/src/schemas.ts`
(`QuestionnaireAnswersSchema`, `ServicePeriodSchema`). The actual question
text, ordering, and branching is implemented in `client/src/Questionnaire.tsx`.
The server route at `server/src/routes/questionnaire.ts` only validates the
submitted body against the schema and forwards it to the eligibility engine; it
defines no question content of its own.

---

## 1. Overview

The questionnaire is a linear, branching, single-page wizard that builds a
single `QuestionnaireAnswers` object describing a veteran's service history,
disability status, financial situation, and notable awards. It has three
logical phases:

1. **Service-period loop.** A repeating sub-flow of up to ten questions that
   collects one or more periods of service. The veteran adds periods one at a
   time and decides at the end of each iteration whether to add another or
   move on.
2. **Post-loop follow-up questions.** A linear sequence of conditional
   questions covering disability rating, life insurance, housing and
   automobile grants, financial means, and decorations. Several branches in
   this phase are gated on dates inside the collected service periods, on the
   answer to a prior question, or on the numeric VA disability rating.
3. **Submission.** The final question (`former-pow`) submits the full answers
   object to `POST /api/questionnaire`. Logged-in users additionally
   `PUT /api/user/results`; anonymous users have results written to
   `localStorage`. The veteran is then redirected to the results page.

In-progress answers, the current step, and a snapshot history are persisted
between page loads in `localStorage` under the keys `vbn_step`, `vbn_answers`,
and `vbn_history`. A Back button restores the prior step+answer snapshot in
LIFO order. All three keys are cleared on submit, on Home/Sign Out (after a
confirm dialog), or on any confirmed nav-away.

The progress indicator at the top of each step displays one of five section
labels: **Service History**, **Health & Disability**, **Insurance**,
**Housing**, **Financial**. Section assignments are static per step and do not
follow strict monotonic order across the flow (see Open Questions).

---

## 2. Field reference

The questionnaire writes a single object that conforms to
`QuestionnaireAnswersSchema`. Every field is required at submission time;
nullable fields have meaningful sentinel semantics described below.

### 2.1 Top-level answer fields

| Field | Type | Allowed values | Sentinels | Description |
|---|---|---|---|---|
| `servicePeriods` | array of ServicePeriod | length 1–20 | — | Ordered list of service periods. Schema enforces `min(1)` and `max(20)`; the client UI does not enforce the upper bound. |
| `serviceConnectedCondition` | boolean \| null | `true`, `false`, `null` | `null` = "I'm not sure" (only reachable via the `service-connected` step) | Whether the veteran reports a current service-connected illness, injury, or condition. Auto-set to `true` whenever the veteran provides any disability rating value, including 0%: a 0% rating is an active VA decision acknowledging service connection at a non-compensable level, not the absence of a condition. |
| `hasDisabilityRating` | boolean \| null | `true`, `false`, `null` | `null` = initial/unset | Whether the veteran reports having a current VA disability rating. Set explicitly by the `has-rating` step. The flow always passes through `has-rating`, so `null` should not occur at submission in normal use. |
| `disabilityRating` | integer \| null | `0`–`100`; the UI offers only multiples of 10 | `null` = veteran has no rating (the `rating-value` step was skipped) | The veteran's current VA disability rating percentage. The schema accepts any integer 0–100; the UI restricts to `{0, 10, 20, …, 100}`. |
| `adaptiveHousingCondition` | boolean | `true`, `false` | initial value `false` | `true` only when the veteran answered Yes to BOTH `housing-condition` (qualifying-conditions list) AND `housing-ownership`. Reset to `false` on every reachable path that skips the housing branch. |
| `hasAutoGrantCondition` | boolean | `true`, `false` | initial value `false` | Veteran reports at least one of the conditions listed in the `auto-grant-condition` step. Stays `false` if that step is skipped. |
| `incomeBelowLimit` | boolean | `true`, `false` | initial value `false` | Whether the veteran's combined net worth and annual income are below the displayed threshold ($163,699 as currently hard-coded). |
| `ageOrDisability` | boolean | `true`, `false` | initial value `false` | Whether the veteran reports any of: age 65+, permanent and total disability, nursing-home patient receiving long-term care, or receiving SSDI/SSI. |
| `purpleHeartPost911` | boolean | `true`, `false` | initial value `false` | Whether the veteran was awarded a Purple Heart on or after 2001-09-11. |
| `hadSGLI` | boolean | `true`, `false` | initial value `false` | Whether the veteran had Servicemembers' Group Life Insurance during service. The `sgli-coverage` step is conditional; on every path that skips it, the field is explicitly set to `false`. |
| `currentlyInVRE` | boolean | `true`, `false` | initial value `false` | Whether the veteran is currently participating in Veteran Readiness and Employment (Chapter 31). The `currently-in-vre` step is only reached when the rating is ≥ 10%; on the rating-0% and no-rating paths, this is explicitly set to `false`. |
| `paidAtTotalDisabilityRate` | boolean | `true`, `false` | initial value `false` | Whether the VA pays the veteran at the 100% disability rate. Auto-set `true` when the rating is 100%; set by the `single-disability-tdiu` step when the rating is 10–90%; otherwise `false`. |
| `formerPOW` | boolean | `true`, `false` | initial value `false` | Whether the veteran was ever a prisoner of war. |
| `servedInVietnam` | boolean | `true`, `false` | initial value `false` | Whether the veteran served in the Republic of Vietnam. The `vietnam-service` step is only reached if at least one collected service period overlaps the Vietnam-era date window; on every path that skips the step, the field is left at its initial `false`. |

### 2.2 ServicePeriod (one entry per `servicePeriods[]`)

| Field | Type | Allowed values | Description |
|---|---|---|---|
| `entryDate` | string | format `YYYY-MM-DD` | Date the veteran entered this period of service. The UI accepts `MM/DD/YYYY`, validates that it is a real calendar date and not in the future, then persists in ISO form. |
| `separationDate` | string | format `YYYY-MM-DD` | Date the veteran separated from this period of service. Validated to be a real calendar date, not in the future, and not before `entryDate`. |
| `activeDuty` | boolean | `true`, `false` | Whether this period was active duty. Drives whether the `activation-periods` and `activation-guidance` follow-ups are shown. |
| `officerOrEnlisted` | enum string | `"officer"`, `"enlisted"` | The veteran's status at the start of the period. |
| `dischargeLevel` | integer | `1`–`5` | Characterization of discharge for this period; see the `DISCHARGE_OPTIONS` constant for the label↔value mapping listed under question 5. |
| `disabilityDischarge` | boolean | `true`, `false` | Whether the discharge for this period was specifically due to a service-connected disability. |
| `completedFullTerm` | boolean | `true`, `false` | Whether the veteran completed the full term of service for this period. |
| `hardshipOrEarlyOut` | boolean | `true`, `false` | Whether the veteran was discharged for a hardship or early out. Set by the `hardship-early-out` step (reached only when `completedFullTerm = false`); explicitly set to `false` on the `completedFullTerm = true` branch. |

### 2.3 Constants referenced by the questionnaire

- **`DISCHARGE_OPTIONS`** — used by the `discharge` question.
  - `Honorable` → `1`
  - `General (Under Honorable Conditions)` → `2`
  - `Other Than Honorable` → `3`
  - `Bad Conduct` → `4`
  - `Dishonorable` → `5`
- **`RATING_OPTIONS`** — used by the `rating-value` question.
  - `0`, `10`, `20`, `30`, `40`, `50`, `60`, `70`, `80`, `90`, `100`
- **`STORAGE_KEYS`** — `vbn_step`, `vbn_answers`, `vbn_history` (cleared on submit and on confirmed navigation away).

---

## 3. Question flow

Every question is numbered in the order it would be encountered on a forward
traversal. Steps that belong to the *service-period loop* (questions 1–11) are
asked once per period, with the veteran returning to question 1 each time the
`add-another` answer is Yes. Each question has a fixed *section label* shown
in the progress indicator; this is recorded under "Section" below.

For each question, the **Trigger** describes what causes it to be reached, and
the **Writes** column lists which fields are mutated by the veteran's answer.
Steps that affect flow but write nothing are noted explicitly.

### Service-period loop

#### 1. `entry-date`

- **Section:** Service History
- **Trigger:** Always shown. Shown again as question 1 of the next iteration
  whenever the veteran answers Yes on the `add-another` step.
- **Question text (variant A — first period):** "Date of entry for your first
  period of service?"
- **Question text (variant B — every period after the first):** "What is the
  date of entry for this period of service?"
- **Input type:** Free-text `MM/DD/YYYY` field with auto-formatting. Persisted
  internally as ISO `YYYY-MM-DD`.
- **Validation:** Must be a real calendar date and not in the future. The Next
  button is disabled while the input is empty or invalid. Pressing Enter
  advances if valid.
- **Writes:** `currentServicePeriod.entryDate`.

#### 2. `separation-date`

- **Section:** Service History
- **Trigger:** Always shown after `entry-date`.
- **Question text:** "What is the date of separation for this period of
  service?"
- **Input type:** Free-text `MM/DD/YYYY` field with auto-formatting; persisted
  as ISO `YYYY-MM-DD`.
- **Validation:** Must be a real calendar date, not in the future, and not
  before `entryDate`. Next is disabled until valid; Enter advances if valid.
- **Writes:** `currentServicePeriod.separationDate`.

#### 3. `active-duty`

- **Section:** Service History
- **Trigger:** Always shown after `separation-date`.
- **Question text:** "Was this period of service active duty?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `currentServicePeriod.activeDuty` (`false` for No, `true` for
  Yes).

#### 4. `officer-enlisted`

- **Section:** Service History
- **Trigger:** Always shown after `active-duty`.
- **Question text:** "Did you start this period of service as an officer or
  enlisted?"
- **Input type:** Two-button choice — **Enlisted** (left) / **Officer**
  (right).
- **Writes:** `currentServicePeriod.officerOrEnlisted`
  (`"enlisted"` or `"officer"`).

#### 5. `discharge`

- **Section:** Service History
- **Trigger:** Always shown after `officer-enlisted`.
- **Question text:** "What was your characterization of discharge for this
  period of service?"
- **Input type:** Single-select dropdown using the `DISCHARGE_OPTIONS`
  constant (see §2.3).
- **Validation:** Next is disabled until a value is selected; Enter advances
  if a value is selected.
- **Writes:** `currentServicePeriod.dischargeLevel` (integer 1–5).

#### 6. `completed-full-term`

- **Section:** Service History
- **Trigger:** Always shown after `discharge`.
- **Question text:** "Did you complete the full term of service for this
  period?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:**
  - **No:** `currentServicePeriod.completedFullTerm = false`. (Continues to
    question 7, `hardship-early-out`.)
  - **Yes:** `currentServicePeriod.completedFullTerm = true` AND
    `currentServicePeriod.hardshipOrEarlyOut = false`. (Skips question 7;
    continues to question 8, `disability-discharge`.)

#### 7. `hardship-early-out`

- **Section:** Service History
- **Trigger:** Shown only when `completed-full-term` was answered No.
- **Question text:** "Were you discharged for a hardship or 'early out'?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `currentServicePeriod.hardshipOrEarlyOut`
  (`false` or `true`).
- **Continues to:** question 8, `disability-discharge`.

#### 8. `disability-discharge`

- **Section:** Service History
- **Trigger:** Always shown after the `completed-full-term` /
  `hardship-early-out` sub-branch.
- **Question text:** "Were you discharged from this period of service
  specifically due to a service-connected disability?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `currentServicePeriod.disabilityDischarge` (`false` or `true`).
- **Branching:** If `currentServicePeriod.activeDuty === true`, skip questions
  9 and 10 and continue to question 11, `add-another`. Otherwise continue to
  question 9, `activation-periods`.

#### 9. `activation-periods`

- **Section:** Service History
- **Trigger:** Shown only when this period was answered as **not** active duty
  (`activeDuty === false`).
- **Question text:** "Were you activated for federal active duty service (not
  including training) during this period?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** *Nothing.* The veteran's answer is not persisted on either the
  service period or the answers object; it only affects whether the
  `activation-guidance` informational step is shown.
- **Branching:** Yes → question 10, `activation-guidance`. No → question 11,
  `add-another`.

#### 10. `activation-guidance`

- **Section:** Service History
- **Trigger:** Shown only when `activation-periods` was answered Yes.
- **Display text (informational, not a question):** "Please add each
  activation as a separate period of service when prompted. This helps us
  accurately determine your eligibility."
- **Input type:** Single **Continue** button.
- **Writes:** Nothing.
- **Continues to:** question 11, `add-another`.
#### 11. `add-another`

- **Section:** Service History
- **Trigger:** Always shown after the rest of the service-period loop has
  completed for the current period.
- **Question text:** "Would you like to add another period of service?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** On either choice, the current
  `currentServicePeriod` (now fully populated) is appended to
  `answers.servicePeriods`.
- **Branching:**
  - **Yes:** Reset `currentServicePeriod` to empty and loop back to question
    1, `entry-date`.
  - **No:** Evaluate two conditions over the (now-final) `servicePeriods`
    array, in order:
    1. **Vietnam-era condition** — if any period satisfies
       `entryDate < 1975-05-07` AND `separationDate > 1955-11-01`, continue
       to question 12, `vietnam-service`.
    2. **VGLI date-window condition** — otherwise, if any period satisfies
       the VGLI date-window predicate (defined below), continue to question
       13, `sgli-coverage`.
    3. **Neither** — continue to question 14, `has-rating`, and explicitly
       set `hadSGLI = false`.

> **VGLI date-window predicate** (`meetsVGLIDateWindow`): returns `true` if
> ANY service period satisfies either:
> - **Active-duty branch:** the period is active duty, the absolute
>   difference between today and `separationDate` is ≤ 485 days, AND the
>   period length (`separationDate − entryDate`) is ≥ 31 days; OR
> - **Non-active-duty branch:** the period is not active duty AND the
>   absolute difference between today and `separationDate` is ≤ 485 days
>   (no minimum length).

### Post-loop questions

#### 12. `vietnam-service`

- **Section:** Service History
- **Trigger:** Shown only when the veteran chose No on `add-another` AND at
  least one collected service period satisfies the Vietnam-era condition
  (entry < 1975-05-07 and separation > 1955-11-01).
- **Question text:** "Did you serve in the Republic of Vietnam?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `servedInVietnam` (`true` or `false`).
- **Branching:** On either answer, evaluate the VGLI date-window predicate
  again. If it matches, continue to question 13, `sgli-coverage`. Otherwise
  continue to question 14, `has-rating`, and explicitly set `hadSGLI = false`.

#### 13. `sgli-coverage`

- **Section:** Insurance
- **Trigger:** Shown when (a) the veteran chose No on `add-another` and the
  Vietnam-era condition was not met but the VGLI date-window predicate was,
  OR (b) the veteran reached `vietnam-service` and the VGLI date-window
  predicate matches.
- **Question text:** "Did you have Servicemembers' Group Life Insurance
  (SGLI) coverage during your service?"
- **Tooltip text (info icon):** "Most service members are automatically
  enrolled in SGLI unless they specifically opted out. If you're unsure,
  you likely had it."
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `hadSGLI` (`false` or `true`).
- **Continues to:** question 14, `has-rating`.

#### 14. `has-rating`

- **Section:** Health & Disability
- **Trigger:** Always reached after the post-loop / SGLI / Vietnam branches
  resolve. (When skipped over from those branches, `hadSGLI` is explicitly
  set to `false`.)
- **Question text:** "Do you have a current VA disability rating?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `hasDisabilityRating` (`false` or `true`).
- **Branching:**
  - **Yes:** continue to question 15, `rating-value`.
  - **No:** skip questions 15–17 (and 19–21); continue to question 18,
    `service-connected`.

#### 15. `rating-value`

- **Section:** Health & Disability
- **Trigger:** Shown only when `has-rating` was Yes.
- **Question text:** "What is your current VA disability rating?"
- **Input type:** Single-select dropdown using `RATING_OPTIONS`
  (`0%`, `10%`, …, `100%`).
- **Validation:** Next is disabled until a value is chosen; Enter applies the
  same branching as Next.
- **Writes (always):** `disabilityRating` = the selected integer; AND
  `serviceConnectedCondition = true`.
- **Branching by chosen rating:**
  - **`100`:** also set `paidAtTotalDisabilityRate = true`. Skip question 16
    and continue to question 17, `currently-in-vre`.
  - **`10`–`90`:** continue to question 16, `single-disability-tdiu`.
  - **`0`:** also set `currentlyInVRE = false` AND
    `paidAtTotalDisabilityRate = false`. Skip questions 16 and 17 and
    continue to question 19, `housing-condition`.

#### 16. `single-disability-tdiu`

- **Section:** Health & Disability
- **Trigger:** Shown only when `disabilityRating` ∈ {10, 20, 30, 40, 50, 60,
  70, 80, 90}.
- **Question text:** "Does the VA pay you at the 100% disability rate?"
- **Tooltip text:** "Your rating and your pay rate can differ. Through TDIU
  (Total Disability based on Individual Unemployability), the VA pays at
  100% when service-connected conditions keep you from working, even if
  your rating is lower."
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `paidAtTotalDisabilityRate` (`false` or `true`).
- **Continues to:** question 17, `currently-in-vre`.

#### 17. `currently-in-vre`

- **Section:** Health & Disability
- **Trigger:** Shown only when `disabilityRating` ≥ 10 (i.e., when the rating
  is 100% — reached directly from `rating-value` — or when the rating is
  10–90% — reached via `single-disability-tdiu`).
- **Question text:** "Are you currently participating in a VR&E (Veteran
  Readiness and Employment / Chapter 31) program?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `currentlyInVRE` (`false` or `true`).
- **Continues to:** question 19, `housing-condition`.

#### 18. `service-connected`

- **Section:** Health & Disability
- **Trigger:** Shown only when `has-rating` was answered No.
- **Question text:** "Do you have a current illness, injury, or condition
  related to your service?"
- **Tooltip text:** "This includes physical injuries, chronic conditions, and
  mental health issues like PTSD, anxiety, or depression. It might have
  started in service, gotten worse in service, or come up later from
  something tied to your service."
- **Input type:** Three-button choice — **I'm not sure** (left) / **No**
  (center) / **Yes** (right).
- **Writes (all three branches):** `adaptiveHousingCondition = false` AND
  one of `serviceConnectedCondition = null` (I'm not sure) / `false` (No) /
  `true` (Yes).
- **Continues to:** question 22, `income-limit`. (Questions 19, 20, 21 — the
  housing and auto-grant branch — are skipped entirely on this path.)

#### 19. `housing-condition`

- **Section:** Housing
- **Trigger:** Shown only when `has-rating` was Yes (i.e., the veteran came
  through the `rating-value` branch). Reached from `currently-in-vre`
  (any rating ≥ 10%) or directly from `rating-value` when the rating is 0%.
- **Question text:** "Do your service-connected disabilities include any of
  the following?"
- **Displayed condition list** (read-only, scrollable; no per-item input):
  1. The loss, or loss of use, of more than one limb
  2. The loss or loss of use of both hands
  3. The loss, or loss of use, of a lower leg along with the residuals
     (lasting effects) of an organic (natural) disease or injury
  4. Blindness in both eyes (with 20/200 visual acuity or less)
  5. Severe burns that limit movement in your arms, legs, or trunk
  6. Lasting breathing problems caused by inhaling smoke, fumes, or chemicals
     (such as COPD, asthma, or pulmonary fibrosis)
  7. The loss, or loss of use, of one lower extremity (foot or leg) after
     September 11, 2001, which makes it so you can't balance or walk
     without the help of braces, crutches, canes, or a wheelchair
- **Input type:** Two-button choice — **No** (left) / **Yes** (right). The
  list is informational; the answer is a single Yes/No covering "any of the
  above".
- **Branching:**
  - **No:** set `adaptiveHousingCondition = false`; continue to question 21,
    `auto-grant-condition`.
  - **Yes:** continue to question 20, `housing-ownership`. (The
    `adaptiveHousingCondition` field is not yet written.)

#### 20. `housing-ownership`

- **Section:** Housing
- **Trigger:** Shown only when `housing-condition` was Yes.
- **Question text:** "Are you currently living in, or planning to live in, a
  home that you or a family member own or will own?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `adaptiveHousingCondition` — `true` only when the answer is
  Yes; `false` otherwise.
- **Continues to:** question 21, `auto-grant-condition`.

#### 21. `auto-grant-condition`

- **Section:** Health & Disability
- **Trigger:** Shown only on the `has-rating = Yes` path. Reached from either
  branch of `housing-condition` (No directly, or Yes via
  `housing-ownership`).
- **Question text:** "Do you have any of the following service-connected
  conditions?"
- **Displayed condition list** (read-only, scrollable):
  1. Loss, or permanent loss of use, of one or both feet
  2. Loss, or permanent loss of use, of one or both hands
  3. Permanent vision impairment in both eyes (20/200 or less in the better
     eye)
  4. Severe burn injuries limiting motion of one or more extremities or the
     trunk
  5. ALS (amyotrophic lateral sclerosis)
  6. Ankylosis of one or both knees or hips
- **Input type:** Two-button choice — **No** (left) / **Yes** (right). Single
  Yes/No covering "any of the above".
- **Writes:** `hasAutoGrantCondition` (`false` or `true`).
- **Continues to:** question 22, `income-limit`.

#### 22. `income-limit`

- **Section:** Financial
- **Trigger:** Always reached. From `service-connected` on the no-rating
  path, or from `auto-grant-condition` on the rating path.
- **Question text:** "Is your combined net worth and annual income below
  $163,699?"
- **Tooltip text:** "This includes all assets except your primary residence
  and personal vehicle. The VA adjusts this threshold annually."
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `incomeBelowLimit` (`false` or `true`).
- **Continues to:** question 23, `age-disability`.

#### 23. `age-disability`

- **Section:** Financial
- **Trigger:** Always shown after `income-limit`.
- **Question text:** "Are any of the following true?"
- **Displayed condition list** (read-only, non-scrollable bullets):
  1. You are 65 years old or older
  2. You have a permanent and total disability
  3. You are a patient in a nursing home receiving long-term care for a
     disability
  4. You are receiving Social Security Disability Insurance or Supplemental
     Security Income
- **Input type:** Two-button choice — **No** (left) / **Yes** (right). Single
  Yes/No covering "any of the above".
- **Writes:** `ageOrDisability` (`false` or `true`).
- **Continues to:** question 24, `purple-heart`.

#### 24. `purple-heart`

- **Section:** Health & Disability
- **Trigger:** Always shown after `age-disability`.
- **Question text:** "Were you awarded a Purple Heart on or after September
  11, 2001?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `purpleHeartPost911` (`false` or `true`).
- **Continues to:** question 25, `former-pow`.

#### 25. `former-pow` (terminal)

- **Section:** Service History
- **Trigger:** Always shown after `purple-heart`.
- **Question text:** "Were you ever a prisoner of war?"
- **Input type:** Two-button choice — **No** (left) / **Yes** (right).
- **Writes:** `formerPOW` (`false` or `true`).
- **On either choice:** the full `answers` object is submitted via
  `POST /api/questionnaire`. On 2xx, results are persisted (PUT
  `/api/user/results` for logged-in users; localStorage for anonymous);
  questionnaire localStorage keys are cleared; the veteran is navigated to
  `/results`.

---

## 4. Branching summary

The following statements enumerate every conditional branch in the flow.

### Branches inside the service-period loop

- **B1 (completed-full-term).** If the veteran answers No on
  `completed-full-term`, then `hardship-early-out` is shown next; otherwise
  it is skipped and `hardshipOrEarlyOut` is set to `false`.
- **B2 (disability-discharge).** If `currentServicePeriod.activeDuty` is
  `true` (set earlier in the same period via `active-duty`), then
  `activation-periods` and `activation-guidance` are skipped and the flow
  goes directly to `add-another`.
- **B3 (activation-periods).** If the veteran answers Yes on
  `activation-periods`, then `activation-guidance` (an informational step)
  is shown; otherwise it is skipped.
- **B4 (add-another loop).** If the veteran answers Yes on `add-another`,
  the current period is appended and the flow loops back to `entry-date`
  for the next period.

### Branches at end of the service-period loop (No on `add-another`)

- **B5 (Vietnam-era gate).** If any collected service period has
  `entryDate < 1975-05-07` AND `separationDate > 1955-11-01`, then
  `vietnam-service` is shown next; otherwise it is skipped.
- **B6 (VGLI date-window gate).** Whenever the post-loop flow would advance
  to `has-rating` (i.e., from `add-another` when no Vietnam-era period
  exists, or from `vietnam-service` regardless of answer), the VGLI
  date-window predicate is evaluated. If it matches, `sgli-coverage` is
  shown first; otherwise `sgli-coverage` is skipped and `hadSGLI` is set
  to `false`.

### Branches in the disability sub-flow

- **B7 (has-rating).** If `has-rating` is answered Yes, the flow goes to
  `rating-value`. If answered No, the flow jumps directly to
  `service-connected`, skipping `rating-value`,
  `single-disability-tdiu`, `currently-in-vre`, `housing-condition`,
  `housing-ownership`, AND `auto-grant-condition`.
- **B8 (rating value 100%).** If `disabilityRating == 100`, then
  `single-disability-tdiu` is skipped, `paidAtTotalDisabilityRate` is
  auto-set to `true`, and the flow goes to `currently-in-vre`.
- **B9 (rating value 10–90%).** If `disabilityRating ∈ {10, …, 90}`,
  `single-disability-tdiu` is shown, and after it the flow goes to
  `currently-in-vre`.
- **B10 (rating value 0%).** If `disabilityRating == 0`, then
  `single-disability-tdiu` and `currently-in-vre` are skipped,
  `paidAtTotalDisabilityRate` and `currentlyInVRE` are explicitly set to
  `false`, and the flow goes directly to `housing-condition`.

### Branches in the housing sub-flow

- **B11 (housing-condition).** If answered No, `housing-ownership` is
  skipped and `adaptiveHousingCondition` is set to `false`; the flow
  proceeds to `auto-grant-condition`. If answered Yes,
  `housing-ownership` is shown.
- **B12 (housing-ownership).** Final value of `adaptiveHousingCondition` is
  set: `true` only when `housing-ownership` is Yes (i.e., Yes on both
  housing-condition and housing-ownership), `false` otherwise. Either
  branch continues to `auto-grant-condition`.

### Service-connected three-way (no-rating path only)

- **B13 (service-connected).** All three options (I'm not sure / No / Yes)
  continue to `income-limit`; they only differ in the value written to
  `serviceConnectedCondition` (`null` / `false` / `true` respectively).
  All three also explicitly set `adaptiveHousingCondition = false`.

### Linear tail (no further branching)

`income-limit` → `age-disability` → `purple-heart` → `former-pow` →
submission. Each of these always advances regardless of the chosen answer;
only the boolean value of the corresponding field changes.

---

## 5. Open questions

These are points where the implementation is ambiguous, asymmetric, or
otherwise unclear from reading the code alone. They are flagged for human
review rather than guessed at.

1. **Schema permits `null` for `hasDisabilityRating`, but the flow always
   writes a boolean.** The `has-rating` step is on every reachable path to
   submission and writes either `true` or `false`. If the schema's
   `nullable()` is intentional (e.g., for a future skip path or to tolerate
   legacy clients), the rationale is not visible in code; if it is
   defensive, the schema may be tighter than it looks.

2. **`activation-periods` answer is not stored anywhere.** The Yes/No
   answer affects only whether the `activation-guidance` informational step
   is shown. No field on the service period or the answers object captures
   whether the veteran was activated, so eligibility cannot reference it.
   If activation status is meaningful for any benefit, this field is
   missing from the answer schema.

3. **Naming mismatch: VGLI predicate gates the SGLI question.** The
   `meetsVGLIDateWindow` helper is used to decide whether to ask
   `sgli-coverage` (an SGLI question). Presumably this is because SGLI is a
   prerequisite for VGLI and the flow only asks about SGLI when VGLI may
   be applicable. The intent is plausible but the naming and the logic
   should be confirmed: in particular, the 31-day minimum is an active-duty
   prerequisite for VGLI conversion, but the question text itself just
   asks about SGLI coverage in general.

4. **`paidAtTotalDisabilityRate` semantics differ from the question text.**
   The question asks "Does the VA pay you at the 100% disability rate?",
   which can be true via a 100% rating, via TDIU, or via other VA pay
   mechanisms. The field name suggests "100% single-disability rating OR
   TDIU specifically". Confirm whether the eligibility engine interprets
   the field as the question (any 100% pay rate) or as the name (rating
   100% or TDIU only).

5. **Section labels jump non-monotonically.** The progress indicator's
   section label moves through: Service History → (Insurance) → Health &
   Disability → Housing → Health & Disability → Financial → Health &
   Disability → Service History (final POW question). This is not strictly
   wrong but may confuse users who expect sections to advance in order.
   The POW question is also the only final-section step that returns to
   "Service History" after several sections away.

6. **Schema permits `disabilityRating` values that the UI cannot produce.**
   `RATING_OPTIONS` is `{0, 10, …, 100}` (multiples of 10), but the schema
   accepts any integer 0–100. Either the schema should restrict to
   multiples of 10, or the UI should expose all integer values (the
   official VA combined ratings are always multiples of 10, so the schema
   is broader than necessary).

7. **Schema permits up to 20 service periods, but the UI does not cap.**
   The `add-another` Yes button has no guard against the schema's
   `max(20)`. A user adding a 21st period would fail validation only at
   submit. Consider either capping in the UI or relaxing the schema.

8. **`adaptiveHousingCondition` collapses two questions into a single
   boolean.** A veteran who has a qualifying housing condition but does
   NOT live in / plan to live in an owned home will end up with
   `adaptiveHousingCondition = false`, identical to a veteran who has no
   qualifying condition at all. The qualifying-condition fact is not
   preserved separately. If the eligibility engine needs to distinguish
   these cases (e.g., for a benefit that ignores ownership), the field
   is too coarse.

9. **"I'm not sure" only exists for `service-connected`.** Several other
   questions (SGLI, Purple Heart, POW) plausibly have uncertain answers
   but offer only Yes/No. This is a UX consistency question rather than
   a code defect.

10. **The `service-connected` step explicitly resets
    `adaptiveHousingCondition = false`.** Since this step is only reached
    on the `has-rating = No` path — and the only writers of
    `adaptiveHousingCondition` are reached via `has-rating = Yes` — the
    field could not have been set to anything other than its default
    `false` here. The reset appears to be defensive; confirm it is not
    masking a flow path where the field was set earlier and would now be
    silently cleared.
