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
- Input: yes / no buttons

**Step: discharge**

- Label: “What was your characterization of discharge for this period of service?”
- Input: dropdown with these options mapped to integer values:
  - Honorable → 1
  - General (Under Honorable Conditions) → 2
  - Other Than Honorable → 3
  - Bad Conduct → 4
  - Dishonorable → 5

**Step: add-another**

- Label: “Would you like to add another period of service?”
- Input: yes / no buttons
- If yes: push current service period to array, loop back to **entry-date**
- If no: push current service period to array, continue to **service-connected**

-----

### Section: Health & Disability

**Step: service-connected**

- Label: “Do you have a current illness or injury that affects your mind or body and is related to your service?”
- Include an info icon (ⓘ) that toggles a tooltip with this text: “This includes physical injuries, chronic conditions, and mental health conditions like PTSD, anxiety, or depression that began or worsened during your service. If you’re unsure, that’s okay — the VA can help determine this.”
- Input: three buttons — Yes / No / I’m not sure
- If “No”: skip to **housing-condition**
- If “Yes” or “I’m not sure”: continue to **has-rating**

**Step: has-rating**

- Label: “Do you have a current VA disability rating?”
- Input: yes / no buttons
- If yes: continue to **rating-value**
- If no: skip to **housing-condition**

**Step: rating-value**

- Label: “What is your current VA disability rating?”
- Input: dropdown with values: 0%, 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100%
- Store as integer (0, 10, 20, … 100)

-----

### Section: Housing

**Step: housing-condition**

- Label: “Do you have any of the following conditions?”
- Display a list of qualifying conditions below the label (use placeholder text for now: “[ list of qualifying conditions will be added ]”)
- Input: yes / no buttons
- If yes: continue to **housing-ownership**
- If no: proceed to submission

**Step: housing-ownership**

- Label: “Are you currently living in, or planning to live in, a home that you or a family member own or will own?”
- Input: yes / no buttons
- Proceed to submission

-----

## Data Shape

The component should build this data structure in state as the veteran progresses through the questionnaire:

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
  hasDisabilityRating: boolean | null;         // null if question was not asked
  disabilityRating: number | null;             // 0-100 in increments of 10, null if no rating or not asked
  adaptiveHousingCondition: boolean;           // true only if BOTH housing-condition AND housing-ownership are "yes", false otherwise
}
```

-----

## Implementation Requirements

- Use a state machine approach with a `currentStep` string identifier (e.g., `'entry-date'`, `'discharge'`, `'service-connected'`) rather than an integer index into a flat array.
- Build each service period incrementally in a `currentServicePeriod` state object, then push it to the `servicePeriods` array when the veteran moves past the **add-another** step.
- Steps **housing-condition** and **housing-ownership** combine into the single `adaptiveHousingCondition` boolean in the final answers object.
- Include a Back button on every step except the first, allowing the veteran to revisit and change previous answers.
- The Back button should correctly restore previous answers when navigating backwards, including navigating back into a service period that was already added.
- Show a section indicator instead of “Step X of Y” since the total steps vary. Display which section the veteran is in: “Service History”, “Health & Disability”, or “Housing”.
- On the final step, the Next/Submit button should say “See My Benefits”.
- Do not log the final answers object to the console on submission for now — the API call will be wired up separately.
- For yes/no button inputs, use styled buttons rather than radio inputs, consistent with the existing `cta-button` class conventions.