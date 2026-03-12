# Research Goals

Research is ongoing throughout development. Goals are listed in priority order — each builds on the previous.

---

## Goal 1 — Federal Benefits Catalogue
Build a comprehensive inventory of every federal benefit available to veterans.

This is the foundation everything else depends on. No eligibility criteria yet — just what exists. Cover all major administering agencies: VA, DoD, SBA, HUD, DOL, and others.

**Outcome:** A structured document listing every known federal veteran benefit by name, category, and administering agency.

---

## Goal 2 — Eligibility Criteria Mapping
For each benefit identified in Goal 1, document exactly what determines eligibility.

This reveals which data points actually matter for determining what a veteran qualifies for. Look for patterns across benefits — many will share common criteria.

**Outcome:** Each benefit in the catalogue annotated with its specific eligibility requirements.

---

## Goal 3 — Veteran Profile Fields
Derived directly from Goal 2 — define the minimum set of questions needed to accurately determine a veteran's eligibility across all benefits.

The goal is the smallest possible set of questions that covers the widest range of eligibility determinations. Every field must justify its existence by being required for at least one benefit determination.

**Outcome:** A finalized list of onboarding questionnaire fields with justification for each.

---

## Goal 4 — VA Lighthouse API Capabilities
Understand exactly which APIs are available, what data they expose, what the sandbox environment offers, and what production access requires.

Key APIs to investigate:
- Facilities locator (likely usable early)
- Benefits intake API
- Patient Health API / FHIR (appointments, health records — requires veteran authentication via Login.gov or ID.me)

Note: Production access for health data requires a VA approval process with a variable timeline. Sandbox access with test data is available immediately at developer.va.gov.

**Outcome:** A clear picture of which APIs are practical for current scope vs. future enhancement.

---

## Goal 5 — State-Level Benefits
Each state offers additional veteran benefits on top of federal ones. This content comes later but must be accounted for in the data structure early.

**Outcome:** An understanding of the scope and variation of state benefits, and a data model that accommodates them without requiring a rebuild.

---

## Goal 6 — Competitive Landscape
Understand what tools already exist, what they do well, and where they fall short.

Known competitors to analyze:
- MyVetBENEFITS (closest competitor — benefits finder, not navigator, 400+ results can overwhelm)
- VA.gov (official but difficult to navigate)
- VetCenter
- Any other apps surfaced during research

**Outcome:** A clear articulation of how this app is different and where it fits in the existing landscape.

---

## Goal 7 — Privacy & Data Handling
Best practices for storing sensitive but non-PII veteran service data. Account recovery options that preserve anonymity.

Key questions to answer:
- What are the ethical and legal considerations for storing veteran service profiles?
- What account recovery mechanism works without requiring an email address?
- Are there any compliance frameworks relevant to this type of data?

**Outcome:** A defined privacy model and account recovery approach for the application.
