# Tech Debt

This file tracks deferred work items that have been deliberately put off — not
bugs awaiting a hotfix, but design and structural improvements that didn't fit
in the scope of the change that surfaced them. Each item is here because
someone judged the cost of doing it now to be higher than the cost of carrying
it for a while longer.

Read each entry before deciding it's still worth doing — some items get cheaper
or more expensive as the surrounding code evolves, and the recommendation may
have aged.

## Convention

Each entry has three sections:

- **Problem** — what is wrong, and how it shows up in practice.
- **Recommended approach** — the shape of the fix as currently understood.
- **Cost** — an honest estimate of scope and what it touches. If two items
  are cheaper to do together, that is called out.

---

## 1. Service-connected dental condition question

**Problem.** The questionnaire asks veterans a single generic question about
whether they have a service-connected condition. The seed text for VA Dental
Care, however, references a narrower category: a "service-connected dental
condition" specifically (a dental injury or condition tied to service, often
from combat). Today the seed and the questionnaire don't agree on what is
being asked, so dental eligibility either over-matches (if the engine treated
any service connection as qualifying) or silently drops the path entirely (the
current state — `checkDental` in `server/src/eligibility.ts` does not look at
`serviceConnectedCondition` at all). Either way, a veteran whose service
connection is, say, a back injury should not be matched to dental on that
basis, and a veteran with a service-connected dental injury currently isn't
matched at all.

**Recommended approach.** Add a new question that asks specifically about a
service-connected dental condition (suggested wording: "Do you have a
service-connected dental condition or dental injury from combat?"). The
question needs to appear on both the rating and no-rating branches, since
either kind of veteran can have a dental-specific service connection. Wire
the new field through `QuestionnaireAnswersSchema` (Zod), the client interface
in `Questionnaire.tsx`, and `checkDental`. Update `docs/questionnaire-spec.md`
to describe the new step.

**Cost.** Roughly the scope of the `singleDisability100OrTDIU` rename that was
done previously: schema + client + server + spec doc, plus a JSONB migration
to default the field on existing rows and a `localStorage` version bump so
in-progress questionnaires don't deserialize against a stale shape. Not a
weekend; not a week either. A focused day or two.

---

## 2. Header component duplication

**Problem.** There are two header components in the client:
`client/src/SiteHeader.tsx` is the standard site header used on most pages,
and `client/src/Questionnaire.tsx` contains its own inline header used while
the user is mid-questionnaire (the in-flow variant has different navigation
behavior — it has to gate or warn before nav-away, since leaving mid-flow
loses progress). The two headers need the same menu items, branding, and
styling, and keeping them in sync is manual. The Resources menu item that was
recently added had to be added in two places; missing the in-flow header was
the original bug that surfaced this.

**Recommended approach.** Either extract the menu items into a shared constant
(or small component) that both headers consume, or — better — make the
in-flow header a wrapper around `SiteHeader.tsx` that injects nav-gating
behavior on top. The wrapper option is more invasive but eliminates the
duplication entirely; the constant option is cheaper and gets you 80% of the
benefit. Consider this together with item #3, since extracting a constant is
a natural early step toward a `shared/` module.

**Cost.** Constant-only refactor: an hour or two. Wrapper refactor: half a
day, plus careful regression-checking of nav-away behavior (which has subtle
keyboard/back-button interactions).

---

## 3. Shared module for client/server code

**Problem.** Some logic and types are duplicated across the client and
server. The clearest examples: the VGLI conversion-window predicate exists in
both `client/src/Questionnaire.tsx` (where it controls whether to ask about
SGLI) and `server/src/eligibility.ts` (where it determines actual VGLI
matching), and they have drifted before. The `QuestionnaireAnswers` type is
also effectively duplicated — once as a Zod schema in `server/src/schemas.ts`
and once as a hand-written interface in the client. Drift between the two
shows up as schema-validation errors that the user can't recover from.

**Recommended approach.** Create a `shared/` directory at the repo root.
Configure Vite (client) and ts-node ESM (server) to resolve imports from it
— this is straightforward in both build systems but does require touching
`client/vite.config.ts` and `server/tsconfig.json`. Migrate the obvious
duplicates first (the VGLI predicate, the `QuestionnaireAnswers` types); leave
anything that's only superficially similar where it is. The best time to do
this is during eligibility test build-out, since the tests will exercise the
shared code from both sides and expose drift quickly.

**Cost.** Setup is half a day; the migration is open-ended depending on how
aggressively you pull things in. Related to item #2 — the menu-items constant
from #2 is a natural early resident of `shared/`.

---

## 4. Email service refusal-to-start

**Problem.** `server/src/services/email.ts` throws at module-load time if
`RESEND_API_KEY` is unset. Because the module is imported transitively at
server startup, a missing key crashes the entire process — even though the
only feature that depends on email is the password-reset endpoint. In a
non-prod environment without email configured, the server simply won't boot,
which is more friction than the dependency warrants.

**Recommended approach.** Pick one of three options deliberately and document
the choice:

- **(a) Keep strict.** Leave the throw in place and pair it with deploy
  automation (a pre-PM2-boot env-var check) that catches a missing key before
  the process restarts. Best if email is considered load-bearing in prod.
- **(b) Soften the boot.** Allow the server to start without the key; only
  the password-reset endpoint fails at runtime, with a clear error. Best if
  the rest of the server should remain usable in degraded environments.
- **(c) Soften with a dev fallback.** Same as (b), but in dev/non-prod log
  the email content to stdout instead of sending. Best for local development
  ergonomics.

The right choice is a product/ops call, not a code call. Document the reason
either next to the code or in this file when the work is done.

**Cost.** Half a day for any of the three, including tests. Option (a) costs
more in deploy-automation work; option (c) costs more in code. None is large.

---

## 5. Documented deploy procedure

**Problem.** The full deploy procedure (git pull → npm install →
`npm run build` → `npm run migrate:up` → `pm2 restart`) is tribal knowledge.
A missing build step caused a staging incident recently — the new code was
present in the source tree but not in `dist/`, so the running process kept
serving the old build. Anyone deploying for the first time is set up to make
the same mistake.

**Recommended approach.** Write the procedure into `server/README.md` (or a
dedicated `DEPLOYMENT.md`) as a numbered list, with the rationale for each
step. Once the procedure is stable, script it as `bin/deploy.sh`. The script
should be safe to re-run (idempotent — re-running a successful deploy should
be a no-op or harmless), and should fail loudly on any step error rather than
silently continuing. Consider also a `bin/deploy-check.sh` that verifies the
deployed version matches what's checked out, which would catch the
missing-build class of incident at the end of the deploy rather than in
production traffic.

**Cost.** Documentation: an afternoon. Script: another afternoon, plus
testing it against staging at least twice. Not large, but easy to keep
deferring because manual deploys keep working.

---

## 6. Activation status field

**Problem.** The `activation-periods` questionnaire step intentionally does
not persist its answer to the schema — eligibility reads activations
indirectly, by treating each entered activation as a normal active-duty
service period in `servicePeriods`. This was a deliberate design decision
documented in `docs/activation-periods.md` and resolved in this session. The
note here is forward-looking: if a future eligibility rule needs to know
*that* the user activated (independent of the activation period being
present in `servicePeriods`), the design needs to change.

**Recommended approach.** Only revisit if such a rule actually appears. At
that point, add a boolean (or richer object) for activation status to
`QuestionnaireAnswersSchema`, persist it from the activation-periods step,
and update the relevant `check*` function in `eligibility.ts`. There is no
work to do today.

**Cost.** Schema migration + client persistence + eligibility update. Small
in isolation but easy to under-scope, since "we already collect that, right?"
is the kind of assumption that bites. Probably half a day if the rule is
clear.
