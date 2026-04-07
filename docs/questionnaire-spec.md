# Questionnaire Specification

## Overview

Refactor `Questionnaire.tsx` from a flat question array into a step-based flow that supports conditional questions and a repeating service period loop.

Keep the existing page structure (header, main with q-card, footer) and CSS class naming conventions. Do not modify `App.css` — use existing classes only.

-----

## Questionnaire Flow

### Section: Service History

**Step: entry-date**

- Label: “What is the date of entry for your first period of service?”
  - For subsequent periods use: “What is the date of entry for this period of service?”
- Input: date picker

**Step: separation-date**

- Label: “What is the date of separation for this period of service?”
- Input: date picker

**Step: active-duty**

- Label: “Was this period of service active duty?”
- Input: No (left) / Yes (right) buttons

**Step: officer-enlisted**

- Label: “Did you start this period of service as an officer or enlisted?”
- Input: Enlisted (left) / Officer (right) buttons

**Step: discharge**

- Label: “What was your characterization of discharge for this period of service?”
- Input: dropdown with these options mapped to integer values:
  - Honorable → 1
  - General (Under Honorable Conditions) → 2
  - Other Than Honorable → 3
  - Bad Conduct → 4
  - Dishonorable → 5
- Navigation: continue to **completed-full-term**

**Step: completed-full-term**

- Label: “Did you complete the full term of service for this period?”
- Input: No (left) / Yes (right) buttons
- Store result as `completedFullTerm` on the current service period
- Both paths continue to **disability-discharge**

**Step: disability-discharge**

- Label: “Were you discharged from this period of service specifically due to a service-connected disability?”
- Input: No (left) / Yes (right) buttons
- Store result as `disabilityDischarge` on the current service period
- If the period was active duty → continue to **add-another**
- If the period was not active duty → continue to **activation-periods**

**Step: activation-periods** (conditional: only shown for non-active duty periods)

- Label: “Were you activated for federal active duty service (not including training) during this period?”
- Input: No (left) / Yes (right) buttons
- This step does not store anything on the service period
- If no → continue to **add-another**
- If yes → continue to **activation-guidance**

**Step: activation-guidance** (conditional: only shown when veteran answers yes to activation-periods)

- Display message: “Please add each activation as a separate period of service when prompted. This helps us accurately determine your eligibility.”
- Continue button (right-aligned) → continue to **add-another**
- This step does not store anything on the service period

**Step: add-another**

- Label: “Would you like to add another period of service?”
- Input: No (left) / Yes (right) buttons
- If yes: push current service period to array, loop back to **entry-date**
- If no: push current service period to array, continue to **has-rating**

-----

### Section: Health & Disability

**Step: has-rating**

- Label: “Do you have a current VA disability rating?”
- Input: No (left) / Yes (right) buttons
- If yes: continue to **rating-value**
- If no: continue to **service-connected**

**Step: rating-value**

- Label: “What is your current VA disability rating?”
- Input: dropdown with values 0%, 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100%
- Store as integer (0, 10, 20, … 100)
- Automatically set `serviceConnectedCondition` to `true` in the answers object
- Continue to **housing-condition**

**Step: service-connected** (conditional: only shown if veteran has no disability rating)

- Label: “Do you have a current illness or injury that affects your mind or body and is related to your service?”
- Include an info icon (ⓘ) that toggles a tooltip with this text: “This includes physical injuries, chronic conditions, and mental health conditions like PTSD, anxiety, or depression that began or worsened during your service. If you’re unsure, that’s okay — the VA can help determine this.”
- Input: three buttons — I’m not sure (left) / No (center) / Yes (right)
- All paths continue to **income-limit** (housing questions are skipped for veterans without a disability rating)

-----

### Section: Housing

**Step: housing-condition**

- Label: “Do your service-connected disabilities include any of the following?”
- Display the following qualifying conditions below the label:
  - The loss, or loss of use, of more than one limb
  - The loss or loss of use of both hands
  - The loss, or loss of use, of a lower leg along with the residuals of an organic disease or injury
  - Blindness in both eyes (with 20/200 visual acuity or less)
  - Certain severe burns
  - Certain respiratory or breathing injuries
  - The loss, or loss of use, of one lower extremity (foot or leg) after September 11, 2001, which makes it so you can't balance or walk without the help of braces, crutches, canes, or a wheelchair
- Input: No (left) / Yes (right) buttons
- If yes: continue to **housing-ownership**
- If no: continue to **income-limit**

**Step: housing-ownership**

- Label: “Are you currently living in, or planning to live in, a home that you or a family member own or will own?”
- Input: No (left) / Yes (right) buttons
- Proceed to **income-limit**

-----

### Section: Financial

**Step: income-limit**

- Label: “Is your combined net worth and annual income below $163,699?”
- Include an info icon (ⓘ) that toggles a tooltip with this text: “This includes all assets except your primary residence and personal vehicle. The VA adjusts this threshold annually.”
- Input: No (left) / Yes (right) buttons
- Proceed to **age-disability**

**Step: age-disability**

- Label: “Are any of the following true?”
- Display a list of conditions:
  - You are 65 years old or older
  - You have a permanent and total disability
  - You are a patient in a nursing home receiving long-term care for a disability
  - You are receiving Social Security Disability Insurance or Supplemental Security Income
- Input: No (left) / Yes (right) buttons
- Proceed to **purple-heart**

-----

### Final Step (section indicator: “Health & Disability”)

**Step: purple-heart**

- Label: “Were you awarded a Purple Heart on or after September 11, 2001?”
- Input: No (left) / Yes (right) buttons
- Both paths submit answers to the server and navigate to the results page

-----

## Data Shape

The component builds this data structure in state as the veteran progresses through the questionnaire:

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
  serviceConnectedCondition: boolean | null;  // null = "I'm not sure", true if veteran has a disability rating
  hasDisabilityRating: boolean | null;         // null if question was not asked
  disabilityRating: number | null;             // 0-100 in increments of 10, null if no rating or not asked
  adaptiveHousingCondition: boolean;           // true only if BOTH housing-condition AND housing-ownership are "yes", false otherwise
  incomeBelowLimit: boolean;
  ageOrDisability: boolean;
  purpleHeartPost911: boolean;
}
```

-----

## Implementation Requirements

- Use a state machine approach with a `currentStep` string identifier (e.g., `'entry-date'`, `'discharge'`, `'has-rating'`) rather than an integer index into a flat array.
- Build each service period incrementally in a `currentServicePeriod` state object, then push it to the `servicePeriods` array when the veteran moves past the **add-another** step.
- Steps **housing-condition** and **housing-ownership** combine into the single `adaptiveHousingCondition` boolean in the final answers object.
- Include a Back button on every step except the first, allowing the veteran to revisit and change previous answers.
- The Back button should correctly restore previous answers when navigating backwards, including navigating back into a service period that was already added.
- Show a section indicator instead of “Step X of Y” since the total steps vary. Display which section the veteran is in: “Service History”, “Health & Disability”, “Housing”, or “Financial”.
- On completion, submit the answers to the server and navigate to the results page.
- For yes/no button inputs, use styled buttons with No on the left and Yes on the right, consistent with the existing `cta-button` class conventions.
- For the three-option service-connected step, order buttons: I’m not sure (left), No (center), Yes (right).
- All yes/no button groups should use a two-column layout with each button centered in its respective half of the q-card.