# Project Overview

## Vision Statement

This application is a user-friendly tool veterans can use to discover and utilize the benefits to which they're entitled. A guided onboarding questionnaire establishes each veteran's individual eligibility and presents their benefits clearly, then continues to guide them through the process of actually claiming them. The app is designed to feel safe and approachable, with minimal, honest language that informs without overwhelming.

---

## Design Principles

### Non-Profit Model
The sole function of this application should be to most effectively connect veterans with benefits and resources. Profit cannot be a factor in any design or implementation decisions.

### Prioritized Clarity
The application will not present veterans with an exhaustive list of benefits. Instead, it will surface the most relevant and impactful benefits for each individual's situation, sequenced in a way that creates a clear starting point and a logical path forward.

### Minimal and Approachable
The design and language of the application should feel safe and comfortable without pandering or patronizing. It should treat veterans as capable adults navigating a genuinely complex system.

### Guided Journey
The app does not simply show veterans what they qualify for — it walks them through the process of actually pursuing and claiming those benefits. Finding a benefit and knowing how to claim it are two different problems. This app addresses both.

---

## Target Users
- All veterans regardless of branch, era, or background
- Veterans accessing the app as individuals on any device (mobile and desktop equally supported)
- Veterans only — not caregivers or VSO workers at this stage

---

## Core Features

### 1. Guided Onboarding Questionnaire
- Collects veteran service profile information to determine eligibility
- Conversational flow — not an overwhelming form
- Populates a personal profile used throughout the app
- Specific profile fields to be determined after benefits research phase

### 2. Personalized Benefits Catalogue
- Displays benefits the veteran qualifies for based on their profile
- Covers federal benefits across all major categories:
  - Healthcare & VA medical services
  - Disability compensation & ratings
  - Education benefits (GI Bill, etc.)
  - Housing & homelessness resources
  - Mental health & crisis resources
  - Employment & career resources
  - Legal aid & VSOs
  - Family & caregiver support
- Each benefit presented with a plain English summary and a link to the official source
- Benefits prioritized by relevance and impact — not presented as an exhaustive list

### 3. Guided Claims Navigation
- Step-by-step guidance for actually pursuing each benefit
- Tells veterans exactly what to do next, not just what exists
- Tracks where a veteran is in each process so they can pick up where they left off

---

## Account & Privacy Model
- Username-based accounts — no personally identifiable information required
- Service details collected (branch, years of service, disability rating, etc.) are not PII in isolation
- Offer sign-up before questionnaire, but don't require it. User should be able to navigate to website, get started immediately, and see their results without ever creating an account.
- At sign-up allow for username or email based account creation. Inform user account recovery is only possible with email registration. Allow email registration post account creation.
- Minimal data collection philosophy — only collect what is genuinely needed

---

## Tech Stack
- **Editor:** GitHub Codespaces (browser-based)
- **AI in terminal:** Claude Code
- **AI for planning:** Claude.ai
- **Frontend:** React + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **Hosting:** VPS
- **Version Control:** Git + GitHub

---

## Competitive Landscape
- **MyVetBENEFITS** — closest existing competitor. Veteran-led, VA-recognized, free, cross-platform. Matches veterans to benefits but functions primarily as a benefits finder, not a navigator. Returns 400+ results which can be overwhelming. Does not guide veterans through the claiming process.
- **VA.gov** — official source but notoriously difficult to navigate, designed around the organization rather than the user.
- **Gap your app fills:** The guided journey from discovery to active claim pursuit remains largely unsolved.

---

## Future Considerations
- VA Lighthouse API integration (Patient Health FHIR API) for pulling actual appointment data
- Open source contributions or nonprofit handoff