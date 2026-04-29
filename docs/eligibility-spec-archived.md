# Eligibility Spec (Archived)

> **Archived 2026-04-29.**
>
> This document originally specified an early design where benefit eligibility
> was driven by rows in the `eligibility_requirements` database table. That
> design was retired in favor of evaluating eligibility directly from
> questionnaire answers in code.
>
> The canonical, current implementation lives in
> [`server/src/eligibility.ts`](../server/src/eligibility.ts). Refer to that
> file for the actual rules — do not treat this archived spec as authoritative.
>
> The supporting machinery has also been removed:
> - The seeder (`server/src/seedRequirements.ts`) — deleted.
> - The `seed:requirements` npm script in `server/package.json` — removed.
> - The `eligibility_requirements` table itself is on the path to removal via a
>   future migration; nothing in application code reads from it.
>
> The original specification is preserved only in version control history.
