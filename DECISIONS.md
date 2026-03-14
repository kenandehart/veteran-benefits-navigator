# decisions log

This document records key decisions made during planning and development, along with the reasoning behind them. Keeping this record prevents revisiting settled questions and provides context for future contributors.

---

## Development Environment

**Decision:** GitHub Codespaces as the primary development environment.
**Reason:** Fully browser-based with a built-in terminal. No software installation required. Includes 60 free hours per month with additional usage billed at ~$0.18/hour for the smallest machine. Supports Claude Code via the terminal.

---

## AI Tooling

**Decision:** Claude Code (CLI) as the primary AI coding assistant, paired with Claude.ai for planning and architecture.
**Reason:** Claude Code understands the entire project context at once — not just the current line being typed. Better suited for complex, interconnected tasks like designing database schemas, writing Express routes, and implementing authentication. Claude.ai handles higher-level planning, learning, and decisions. The two tools are separate systems and do not share memory — project documentation files bridge this gap.

**Decision rejected:** GitHub Copilot as primary AI assistant.
**Reason:** Copilot is reactive (responds to what you're typing) rather than proactive. Better suited for developers who already know what they're building. Claude Code's whole-project awareness is more valuable for this stage of development and for learning.

---

## Backend Approach

**Decision:** Node.js + Express + TypeScript for the backend.
**Reason:** Chosen over Supabase and other backend-as-a-service options because the developer is pursuing a software engineering degree. Writing actual API endpoints, handling HTTP requests, managing middleware, and designing database schemas maps directly to degree coursework and job interview expectations. The learning curve is steeper but the educational value is higher.

**Decision rejected:** Supabase as backend.
**Reason:** Abstracts away too many foundational concepts. Excellent for shipping quickly but not appropriate for someone whose goal is a deep understanding of how systems work.

---

## Database

**Decision:** PostgreSQL.
**Reason:** Industry standard relational database. Almost certainly covered in the developer's degree program. Writing real SQL and designing schemas is a core software engineering skill. Hosted on Railway or Render — no local installation required.

---

## Frontend

**Decision:** React + TypeScript.
**Reason:** React is the industry standard for component-based UI development. TypeScript adds type safety, catches errors before runtime, and builds good engineering habits around thinking carefully about data structures. Slightly steeper learning curve than plain JavaScript but directly applicable to professional environments.

---

## Account Model

**Decision:** Username-based accounts with no required PII.
**Reason:** Veterans may be guarded about sharing personal information with another digital system. Collecting only what is necessary builds trust and aligns with a minimal data collection philosophy. An account recovery mechanism that preserves anonymity is to be determined during the research phase.

---

## Appointment & Claims Tracking

**Decision:** Manual user input only for the initial version.
**Reason:** VA system integration via the Patient Health FHIR API is technically possible but requires veteran authentication through Login.gov or ID.me, a non-trivial implementation, and a VA production access approval process with an unpredictable timeline. The manual tracking feature will work standalone, with VA API integration as a clearly defined future enhancement.

---

## Benefits Presentation

**Decision:** Prioritized, curated benefits display rather than exhaustive list.
**Reason:** Competitive analysis of MyVetBENEFITS revealed that presenting 400+ matched benefits recreates the same overwhelm the app is trying to solve. Veterans need a clear starting point and a logical path forward. The full catalogue exists in the system but the interface surfaces what is most relevant and impactful first.

---

## Hosting

**Decision:** Self-hosted on a Virtual Private Server (VPS) via DigitalOcean.
**Reason:** Chosen over managed platforms like Railway and Render for educational value. Configuring a Linux server manually — installing Nginx, setting up SSL, managing deployments, and administering a production PostgreSQL database — maps directly to software engineering fundamentals and provides depth of knowledge that managed platforms abstract away.
