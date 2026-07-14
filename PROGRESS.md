# TaxOps — Progress Log

## Day 1 — Scaffold (2026-07-12)

### Built

- Next.js 16.2.10 app (App Router, TypeScript strict, Turbopack) scaffolded into
  `c:\Users\vishw\Vish\Vish\KeepMore\taxops` — a subdirectory of the parent `KeepMore` dir,
  chosen over renaming the parent (see below).
- Tailwind CSS v4 + shadcn/ui initialized (`components.json`), core primitives installed:
  button, input, label, card, checkbox, select, tabs, dialog, badge, separator, sonner,
  table, skeleton, textarea, radio-group.
- Core deps installed: `zod`, `react-hook-form`, `@hookform/resolvers`,
  `@supabase/supabase-js`, `@supabase/ssr`.
- Vitest configured (`vitest.config.ts`, jsdom env, 100% coverage thresholds scoped to
  `src/lib/tax/**`) with a first passing unit test (`src/lib/tax/round.ts` +
  `round.test.ts`) to prove the toolchain.
- Playwright configured (`playwright.config.ts`, chromium project, `e2e/` dir created,
  browser binary installed).
- `package.json` scripts added: `typecheck`, `test`, `test:watch`, `test:coverage`, `e2e`.
- `CLAUDE.md` rewritten as the full project constitution (scope, disclaimer rules,
  calculation rules, privacy, a11y, quality loop, stack decisions, directory layout).
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md` written.
- Supabase local project initialized (`supabase init` → `supabase/config.toml`).
- Migration `supabase/migrations/20260712000000_init_schema.sql`: `profiles`, `checklists`,
  `checklist_items`, `saved_articles`, `saved_scenarios`, all with RLS enabled and
  owner-only policies (`checklist_items` derives ownership through its parent `checklists`
  row since it has no `user_id` column of its own).
- `supabase/seed.sql`: one demo user (`demo@taxops.local` / `password123`) with a sample
  profile, checklist + items, saved article, saved scenario.
- `.env.local.example` for the two public Supabase env vars.
- CI: `.github/workflows/ci.yml` runs typecheck → lint → test:coverage → build on push/PR.
- Quality loop verified green: `npm run typecheck && npm run lint && npm test && npm run build`
  all pass on the current scaffold.

### Assumptions made (recorded, most conservative option chosen)

1. **Project directory**: brief assumed an empty dir named `taxops`; actual dir was named
   `KeepMore`. Asked the user — confirmed to create a `taxops` subdirectory rather than use
   `KeepMore` as the root.
2. **Next.js 16 naming**: this Next version renamed `middleware.ts` → `proxy.ts` (same
   purpose). Day 2 auth work will use `proxy.ts`. Documented in `CLAUDE.md`.
3. **Cache Components**: Next 16's opt-in `cacheComponents` flag (PPR / `"use cache"`) is
   left **disabled**. Almost every route here is per-user/auth-gated, so the static-shell
   benefit is small and the mandatory `Suspense`-around-every-dynamic-read discipline isn't
   worth it for v1. Documented as a considered decision in `CLAUDE.md`, not a placeholder.
4. **shadcn form component**: this shadcn/ui version (on `@base-ui/react`, not Radix)
   doesn't ship a `form.tsx` registry item. Installed `react-hook-form` +
   `@hookform/resolvers` directly; a local `src/components/ui/form.tsx` wrapper will be
   built when the first form (Day 4 calculator or Day 6 interview) needs it, rather than
   speculatively now.
5. **Zod v4** installed (latest at scaffold time) rather than pinning v3. No schemas written
   yet to validate against; will confirm v4 API compatibility when
   `src/lib/validation/` schemas are first written (Day 3+).
6. **npm peer deps**: `@vitejs/plugin-react` (via `@rolldown/plugin-babel`) conflicts with
   the `@babel/core` version shadcn's toolchain pulls in — both bleeding-edge packages.
   Resolved with `--legacy-peer-deps` for that one install; devDependency-only, no runtime
   impact. CI's `npm ci` also uses `--legacy-peer-deps` for the same reason.
7. **CI Supabase env var**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` in CI falls back to a placeholder
   string since no code yet reads it at build time. Will need a real CI secret (or continue
   with the placeholder) once Day 2 auth code lands — revisit then, not now.

### BLOCKED (resolved Day 2 — see below)

- ~~Docker Desktop is not running~~ — resolved 2026-07-12: Docker Desktop started, local
  Supabase stack now runs and the migration/seed are verified. Details under Day 2.

## Day 2 — Auth, Layout, Disclaimer (2026-07-12)

### Precondition: local Supabase verified

- Started Docker Desktop, then `npx supabase start`. Found and fixed along the way:
  1. **Port conflict**: this machine already runs another local Supabase project
     (`mindmosaic-platform`) on the default ports (54321-54327). Moved TaxOps to
     54331-54339 in `supabase/config.toml` (a documented, standard way to run multiple local
     Supabase projects side by side). Updated `.env.local.example` and `.github/workflows/ci.yml`
     to match.
  2. **Flaky image pulls**: the `studio` and `edge_runtime` container images repeatedly failed
     mid-pull from CloudFront (transient network path issue, unrelated to this repo) and
     `edge_runtime` additionally failed on a TLS certificate error reaching `deno.land`
     (`invalid peer certificate: UnknownIssuer` — looks like a network/proxy TLS-interception
     issue on this machine). Disabled both in `supabase/config.toml`
     (`[studio] enabled = false`, `[edge_runtime] enabled = false`). Neither is needed: Studio
     is only an admin UI, and this project has zero Supabase Edge Functions in v1 scope.
     Reversible — flip back to `true` if the network issue clears and Studio access is wanted.
  3. **Real bug found and fixed**: `supabase db reset` applied the Day 1 migration and seed
     with no SQL errors, but the RLS smoke test (below) then failed with
     `permission denied for table profiles` for both the anon *and* service-role clients. This
     Supabase version no longer auto-exposes newly created tables to the Data API roles
     (`anon`/`authenticated`/`service_role`) without explicit `GRANT`s — the Day 1 migration
     relied on the old implicit-exposure default, which no longer holds. Fixed by adding
     explicit grants to the same migration file (not a patch migration, since nothing had
     consumed the Day 1 migration outside this local, just-created Docker instance):
     `authenticated` gets full CRUD (RLS still restricts to the owner's rows), `service_role`
     gets full access for admin/seed/test scripts, and **`anon` gets no grant at all** on any
     of the five user tables — no v1 feature needs unauthenticated access to user data, so the
     row is unreachable rather than reachable-but-RLS-filtered (stronger of the two).
- Confirmed seed rows exist (`profiles`, `checklists` + 6 `checklist_items`, `saved_articles`,
  `saved_scenarios` all populated for the demo user) via `supabase db reset` output and the RLS
  script's own queries.
- **RLS smoke test**: wrote `scripts/smoke-test-rls.mjs` (one-off dev tool, not part of the
  automated Vitest/CI suite since it needs a live `supabase start` stack — kept in the repo
  since re-running it after any RLS policy change is cheap and directly serves the
  constitution's Privacy principle). It creates a throwaway second user via the service-role
  client, then asserts:
  - an anon client is rejected outright reading `profiles` (`permission denied`, zero rows)
  - an authenticated (demo user) client sees exactly its own profile row and cannot read the
    second user's row either via unfiltered `select` or by direct `id` filter
  - **Result: all assertions passed.**
- Local dev now uses ports 54331 (API)/54332 (DB) instead of the Supabase defaults — noted in
  `README.md`'s "Getting started" implicitly via `.env.local.example`; explicit callout added
  here for anyone who copies commands from Supabase's own docs (which assume 54321/54322).

### Built

- **Supabase client factories**: `src/lib/supabase/client.ts` (browser), `server.ts` (Server
  Components/Actions/Route Handlers via `next/headers` cookies), `middleware.ts`
  (`updateSession` helper used by `proxy.ts`) — standard `@supabase/ssr` `getAll`/`setAll`
  cookie pattern (the deprecated `get`/`set`/`remove` API is not used).
- **Zod schemas** (`src/lib/validation/auth.ts`): `signUpSchema`, `signInSchema`,
  `requestPasswordResetSchema`, `updatePasswordSchema`. Password minimum set to 8 (Supabase's
  own default is 6) as a slightly stronger baseline without a full strength meter. Tests in
  `auth.test.ts` cover valid input, invalid email, short password, and mismatched-password
  cases for every schema.
- **Server actions** (`src/app/(auth)/actions.ts`): `signUpAction`, `signInAction`,
  `signOutAction`, `requestPasswordResetAction`, `updatePasswordAction`. Every action
  re-validates with the same Zod schema server-side even though the form already validated
  client-side (constitution's Privacy rule). Returns `{ status: "error" | "info", message }`
  on failure/info, redirects on success.
- **`proxy.ts`** (Next 16's renamed `middleware.ts`): fail-closed matcher — everything except
  static assets is protected by default; `PUBLIC_PATHS` allowlists `/`, the auth pages, `/tips/*`,
  and `/auth/*` (the PKCE callback). Optimistic redirect only, per Next's own Proxy docs; the
  `(app)` layout independently re-verifies via `getUser()` (not `getSession()`, which is
  unverified) before rendering anything private. Tests in `proxy.test.ts` mock `updateSession`
  and cover: protected+unauthenticated → redirect with `redirectTo`, every public path +
  unauthenticated → pass-through, protected+authenticated → pass-through.
- **`/auth/confirm` PKCE callback** (`src/app/auth/confirm/route.ts`): not explicitly named in
  the brief ("password-reset **request** flow" only), but necessary plumbing — without it,
  the emailed reset/confirmation link has nowhere to exchange its `code` for a session under
  `@supabase/ssr`'s cookie-based model. Exchanges the code, then redirects to `next` (defaults
  to `/dashboard`; the reset flow passes `next=/update-password`). Also added the
  `update-password` page itself for the same reason — a request-only flow with no completion
  page would be non-functional. Logged here as a deliberate scope completion, not creep.
- **`<Disclaimer />`** (`src/components/disclaimer.tsx` + `src/lib/disclaimers/index.ts`):
  `variant: "inline" | "footer" | "calculator"` only, no free-text prop, wording lives in one
  constant. Rendered in both the authenticated `(app)` layout footer and the public
  `(marketing)` layout footer (the very first brief message asked for a *global* footer
  disclaimer; this Day 2 message scoped the requirement to the authenticated shell alone, but
  narrowing to only one of the two footers would contradict the earlier instruction, so both
  keep it). Tests in `disclaimer.test.tsx` check exact wording renders for all three variants.
- **Layout shells**: `(marketing)` (public header/nav + footer, home page, `/tips` stub),
  `(auth)` (centered card, no nav), `(app)` (sidebar nav — Dashboard/Tax Profile/
  Calculators/Checklists/Tips — + user-menu dropdown with sign-out + footer). Stub pages for
  `dashboard`, `profile`, `calculators`, `checklists` so the protected routes and nav have
  somewhere real to point during this and later verification; each just states what lands
  there on its scheduled day.
- **Form wiring without shadcn's `form.tsx`**: `src/components/ui/form-field.tsx`, a small
  accessible label/control/error/description wrapper for `react-hook-form` `register()`
  fields (labels, `aria-invalid`, `aria-describedby`, visible error text) — built now since
  it'll be reused by every future form (calculators, tax-profile interview), not just these
  four.
- **shadcn/`@base-ui/react` API surface note**: this shadcn version is built on `@base-ui/react`,
  not Radix, and it does **not** support Radix's `asChild` pattern at all — `Button` has no
  `asChild` prop, and base-ui's own docs explicitly say links should never go through a
  component's `render` prop (style the `<Link>` directly instead). Fixed every "button that's
  actually a link" spot (marketing header/hero, user-menu trigger) to apply
  `buttonVariants({...})` as a plain `className` on the `Link`/`DropdownMenuTrigger` instead of
  wrapping a nested `<Button>`. Worth remembering for every later shadcn button+link usage.
- Added shadcn `dropdown-menu` and `avatar` components (needed for the user menu).

### Verification

- Full quality loop green: `typecheck && lint && test && build`. 25 tests across 4 files
  (round, auth schemas, Disclaimer, proxy).
- **Live dev-server check** (not just unit tests): started `npm run dev` (auto-picked port
  3001 — 3000 was already held by another local process) and hit it with `curl`:
  - `GET /dashboard` unauthenticated → `307` to `/sign-in?redirectTo=%2Fdashboard` ✓
  - `GET /` and `GET /tips` unauthenticated → `200` ✓ (public despite proxy's fail-closed default)
  - `GET /auth/confirm` with no `code` → `307` to `/sign-in?error=auth-confirm-failed` ✓
  - `/sign-in` HTML contains the sign-in form; `/` footer contains the exact disclaimer text ✓
  - The RLS smoke test (see precondition above) already separately proved
    `supabase.auth.signInWithPassword` against the demo user works end-to-end at the Supabase
    level.
  - **Gap, stated plainly**: actually driving the React form → Server Action → redirect →
    session-cookie loop through a real browser was not done here — there's no browser/Playwright
    tool available in this environment. Everything that *can* be verified without one (proxy
    logic, route protection, page content, real Supabase auth calls) was verified directly
    rather than assumed. The click-through gap is exactly what Day 9's Playwright critical-path
    suite (sign-up → profile → calculator → save scenario) is scheduled to close — flagging it
    now rather than glossing over it.

## Day 3 — FY2025-26 Tax Configuration + Calculation Engines (2026-07-12)

### Restructuring: `src/lib/tax/` → `src/lib/calculators/` + `src/lib/tax-config/`

Day 1's `CLAUDE.md` originally specified `src/lib/tax/` (engines) and
`src/lib/tax/config/FY2025-26.ts` (rates). This Day 3 message explicitly specified
`src/lib/calculators/` and `src/lib/tax-config/fy2025-26.ts` instead. Followed the newer,
explicit instruction: deleted the old `src/lib/tax/` (just the Day 1 `round.ts` smoke-test
util, superseded below), updated `CLAUDE.md`'s "Calculation rules" and "Directory structure"
sections to match, and repointed `vitest.config.ts`'s coverage `include`/`exclude` at the new
path. Logged here rather than silently diverging from what Day 1 wrote down.

### Built

- **`src/lib/tax-config/types.ts`**: `TaxBracket`, `SourcedValue<T>` (value + ATO source URL +
  `verified: boolean` + optional `note`), `TaxYearConfig`.
- **`src/lib/tax-config/fy2025-26.ts`**: see the Human Gate 1 table below for every value,
  source, and verification status.
- **`src/lib/calculators/money.ts`**: `toCents`/`toDollars` - the one rounding policy every
  engine uses (accumulate in integer cents, round once per intermediate value, convert to
  dollars only at the output boundary). Also normalizes `-0` to `0` (see "Deviations" below).
- **`calculateIncomeTax`** (`income-tax.ts`): brackets + LITO (non-refundable, capped at gross
  tax) + Medicare levy (with the standard 10%-shade-in low-income reduction). Also exports
  `marginalRateAt`, used by the property cash-flow engine. Itemized `breakdown` per bracket,
  not just a total.
- **`calculateContractorTakeHome`** (`contractor-take-home.ts`): day rate × days/week ×
  weeks/year (defaults to 48 weeks - see assumptions in the file) → gross/super/assessable/tax/
  net. Handles both `inclusive` (back out super from a total package: `super = total *
  sgRate/(1+sgRate)`) and `exclusive` (super paid on top) treatments. Deliberately has **no**
  PAYG/ABN/company "structure" input - that comparison is Day 4's job; this engine is the
  single building block it will call.
- **`calculatePropertyCashFlow`** (`property-cash-flow.ts`): rent/expenses/interest/
  depreciation → taxable rental result, cash-only result (depreciation excluded - it's
  non-cash), and the tax effect at the investor's marginal rate (via `marginalRateAt`).
  Every result carries `isEstimate: true` and an explicit "pre-advice estimate" assumption
  string, per the brief's labelling requirement.
- **`calculateDiv293`** (`div293.ts`): combined income (taxable income + concessional
  contributions) vs. the $250,000 threshold; low-tax contributions capped at the concessional
  cap (excess contributions are excluded - they're assessed separately at marginal rates,
  not the 15% Division 293 rate).

### Deviations / things worth knowing

- **HELP/STSL excluded from this config.** The brief scoped it conditionally ("if in scope
  for the take-home calculator"), and I wasn't confident enough in the exact FY2025-26
  indexed repayment thresholds to include them without guessing — HELP reform in the 2025
  Budget materially raised the minimum repayment threshold, and I don't have a verified
  precise figure for this financial year. Rather than fabricate a plausible-looking number,
  I left it out entirely. **Needs a decision at Gate 1**: is HELP/STSL modeling wanted for
  the contractor take-home calculator? If yes, I'll source it properly (ideally from a live
  ATO lookup) before adding it.
- **`-0` rounding bug caught by a test, not inspection**: `calculatePropertyCashFlow`'s
  all-zero-inputs test failed with `expected -0 to be +0` — `Math.round(-0 * rate)` produces
  negative zero, which would have rendered as "-$0.00" in the UI. Fixed generically in
  `money.ts`'s `toDollars` (`cents / 100 || 0`) rather than patching just the one call site,
  since any engine subtracting to exactly zero before a rate multiplication could hit this.
- **Dead code found via coverage, not deleted, converted into a real guard**: `marginalRateAt`
  originally had a fallback `return` after its bracket loop that could never execute with a
  valid config (the last bracket always has `max: null` and always matches). Per the
  constitution's "don't add handling for scenarios that can't happen," I didn't want
  unreachable code sitting there unexercised - but a config file *is* hand-authored, so a
  future edit that drops the trailing `max: null` bracket is a plausible mistake worth
  guarding against. Rewrote it as an explicit invariant check that throws a descriptive error,
  and added one test that intentionally passes a malformed config to exercise that throw.
  100% coverage achieved honestly, not by weakening the check.

### Human Gate 1 — FY2025-26 config values for sign-off

**⛔ Please review before any calculator UI is built on top of this config (Day 4-5).**

| Value | FY2025-26 figure | Status | Source |
|---|---|---|---|
| Income tax brackets | 0% to $18,200 / 16% to $45,000 / 30% to $135,000 / 37% to $190,000 / 45% above | ✅ Matches the checksum supplied for this task | ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents |
| Medicare levy rate | 2% | ✅ High confidence (unchanged since 2014) | ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy |
| Medicare levy low-income thresholds (single) | Lower $27,222 / upper $34,027 | ⚠️ **NOT independently reconfirmed for FY2025-26** - carried forward from the last confirmed FY2024-25 figures. These are indexed annually; please verify against the ATO before relying on this. | ato.gov.au/.../medicare-levy-reduction-for-low-income-earners |
| LITO (Low Income Tax Offset) | Max $700; full to $37,500; tapers 5c/$1 to $45,000 ($325); tapers 1.5c/$1 to $66,667 ($0) | ✅ High confidence - unchanged since the FY2020-21 LITO redesign, not indexed | ato.gov.au/.../low-income-tax-offset |
| Super Guarantee rate | 12% | ✅ High confidence - final legislated step, matches the figure given in this task's brief | ato.gov.au/rates/key-superannuation-rates-and-thresholds/ |
| Concessional contributions cap | $30,000 | ✅ Matches the figure given in this task's brief; no indexation trigger identified for FY2025-26 | ato.gov.au/rates/key-superannuation-rates-and-thresholds/ |
| Division 293 threshold | $250,000 | ✅ High confidence - fixed, not indexed, unchanged since FY2017-18 | ato.gov.au/rates/key-superannuation-rates-and-thresholds/ |
| Division 293 rate | 15% | ✅ High confidence | ato.gov.au/rates/key-superannuation-rates-and-thresholds/ |
| HELP/STSL thresholds | *excluded* | ⚠️ Deferred - see "Deviations" above | — |

Two more things worth flagging while reviewing: (1) the ATO URLs above are the general pages
I'm confident cover each topic from memory, but ATO restructures its site periodically -
worth a quick click-through rather than assuming the exact path is still live; (2) Medicare
levy modeling here is single-person, standard (non-senior/pensioner) thresholds only - no
family thresholds, no Medicare Levy Surcharge - which matches this task's scope but is worth
confirming is still the intended v1 boundary.

### Verification

- Full quality loop green: `typecheck && lint && test:coverage && build`.
- **100% statement/branch/function/line coverage** on `src/lib/calculators/` (55 tests across
  4 engine files), enforced by `vitest.config.ts`'s thresholds - not just claimed.
- Every threshold has a below/at/above boundary test with the exact expected cent value
  hand-computed in a comment next to the assertion (see `income-tax.test.ts`'s bracket-boundary
  block for all five brackets, `div293.test.ts` for the $250,000 threshold).
- One golden-file test per engine, each with a fully hand-computed expected value in a comment:
  $100,000 income tax ($22,788 net), $800/day×192 days exclusive-super take-home ($112,358
  net), a negatively-geared property ($4,110 after-tax cash flow), and $240k/$25k Division 293
  ($2,250 additional tax). The contractor take-home test additionally cross-checks its
  inclusive-super golden value against the income-tax golden value (both reduce to exactly
  $100,000 assessable income) as an internal consistency check.
- No UI touched this day; stub pages from Day 2 are unchanged.

## Day 3.5 + Day 4 — Config Corrections, then Contractor Take-Home Calculator UI (2026-07-12)

### Part A: config corrections (blocking, done first)

Direct `ato.gov.au` fetches were blocked (HTTP 403, bot detection) on both the Medicare levy
page and the HELP/STSL repayment-rates page. Verified via web search instead, cross-checking
independent secondary sources against each other and against this task's own stated figures
via internal mathematical consistency checks (not a single unverified source taken on faith).

- **Medicare low-income thresholds updated** for the 2026-27 Budget's 2.9% retroactive
  uplift: single lower $28,011 (was $27,222), single upper **$35,013** (was $34,027), plus
  family lower $47,238, senior single $44,268, senior family $61,623, per-dependant $4,338
  now stored for reference (not yet wired into the engine - only single lower/upper are used
  in v1). **Discrepancy flagged as instructed**: this task's own estimate for the single
  upper threshold was "~$35,014" via the 10c shade-in formula; the actual gazetted figure
  found is $35,013 (a $1 difference) - used the sourced figure, not the estimate.
- **HELP/STSL added to config**, and a real sourcing near-miss caught along the way: an
  initial search returned $69,528 / $129,717 / $186,050 as "2025-26" figures from a
  secondary site titled "...for 2026" - a second, more targeted search confirmed those are
  actually the **indexed FY2026-27** thresholds, not FY2025-26. The correct FY2025-26 figures
  (minimum $67,000; 15% band to $125,000; 17% band above, uncapped; flat-10% cap crossover at
  $179,286) cross-checked exactly against this task's own stated cap-point figure via the
  formula `(179,286 - 125,000) × 0.17 + 8,700 ≈ 179,286 × 0.10`. Had I used the first search's
  numbers uncritically, every HELP repayment estimate would have been for the wrong year.
- **`calculateHelpRepayment(repaymentIncome, config)`** added (`help-repayment.ts`), input
  named `repaymentIncome` per the task's requirement, with JSDoc noting it must already
  include reportable fringe benefits, net investment losses, reportable super contributions,
  and exempt foreign income - this engine does not derive it from taxable income. Uses
  `min(marginalBandAmount, flatCapAmount)`, which elegantly produces the correct "marginal
  below the cap, flat 10% above it" behaviour with no separate branch - **provided the top
  band is uncapped (`max: null`)**. It briefly wasn't: an early version capped the 17% band
  at the $179,286 cap threshold, which froze the marginal amount there instead of letting it
  keep growing - the golden-file test (`$200,000 -> $20,000`, not the `$17,928.62` the buggy
  version produced) caught this immediately. Fixed by making the band uncapped and adding a
  code comment explaining why, so the "obvious-looking" bounded band doesn't get
  reintroduced later.
- **Existing golden tests updated for the threshold change**: only one test was actually
  affected - `income-tax.test.ts`'s $30,000 Medicare shade-in test (all bracket-boundary and
  other golden tests sit above the new $35,013 upper threshold too, same as the old $34,027
  one, so their expected values were unchanged). New expected values: Medicare levy $198.90
  (was $277.80), net tax $1,386.90 (was $1,465.80) - both hand-recomputed in the test's
  comment.
- Quality loop green (typecheck/lint/test:coverage/build) before starting Part B, 64 tests,
  100% coverage maintained.

### Part B: Contractor Take-Home Calculator UI

- **`/calculators/contractor-take-home`** page + `ContractorTakeHomeCalculator` (form,
  `src/components/calculators/`) + `ContractorTakeHomeResults` (results panel, separate
  component for testability). Linked from the `/calculators` index stub so it's actually
  reachable via nav, not orphaned.
- **Form**: `react-hook-form` + Zod (`src/lib/validation/calculators.ts`,
  `contractorTakeHomeFormSchema`) - day rate (positive, capped at $50,000 as a sanity bound),
  billable days/week (positive, max 7), weeks worked/year (positive, max 52, **defaults to
  46** per this task - note this differs from the engine's own internal default of 48 used
  when `weeksWorkedPerYear` is omitted entirely; the form always supplies a value explicitly,
  so the engine default never actually applies here, but it's worth knowing two different
  "48 vs 46 weeks" defaults now exist in the codebase for different reasons), super
  inclusive/exclusive radio, optional HELP debt checkbox.
- **Results panel**: itemized breakdown (gross, super, assessable, gross tax, LITO, Medicare,
  HELP if toggled, net annual, net per week), financial year prominently labelled,
  `<Disclaimer variant="calculator" />` rendered directly in the results card (not
  dismissable - there's no close/dismiss affordance), and a collapsible "assumptions used"
  list merging both engines' `assumptions` arrays plus one UI-specific note (see below).
- **HELP composition is a UI-layer decision, not a new engine**: `calculateContractorTakeHome`
  and `calculateHelpRepayment` stay independent, single-purpose, already-tested Day 3/3.5
  engines; the calculator component calls both and does one line of arithmetic
  (`netTakeHome - helpRepayment`) to combine them. HELP's `repaymentIncome` is approximated
  as the take-home engine's `assessableIncome` (no FBT/investment-loss modeling here) - this
  approximation is explicitly surfaced as an assumption in the results panel, not hidden.
- **No persistence**: inputs are local component state only, matching this task's explicit
  privacy instruction (don't store calculator inputs without a defined user benefit - saved
  scenarios are a later, deliberate decision).
- **A real base-ui accessibility gotcha caught before it shipped**: `@base-ui/react`'s
  `Checkbox.Root` and `Radio.Root` both render as a `<span>` by default specifically to
  support the *enclosing*-label pattern (`<label><Checkbox />text</label>`); their own docs
  warn that the alternative sibling `htmlFor`/`id` pattern (what shadcn's separate `<Label>`
  component does) does **not** reliably associate or toggle these controls. Used the
  enclosing-label pattern for both the super-treatment radios and the HELP checkbox instead
  of the `<Label htmlFor>` pattern used elsewhere in the app. Worth remembering for every
  future radio/checkbox usage in this codebase.
- **A real RHF+Zod typing conflict, not a workaround**: `z.coerce.number()` fields have a
  different *input* type (`unknown`, before coercion) than their *output* type (`number`,
  after), which `useForm<T>`'s single-generic signature can't represent - TypeScript
  correctly rejected the naive version. Fixed with react-hook-form's three-generic
  `useForm<RawInput, unknown, ParsedOutput>` signature and two exported schema types
  (`z.input<>` / `z.output<>`) rather than casting anything to `any`.
- **New devDependency**: `@testing-library/user-event`, to simulate realistic
  typing/clicking on the base-ui radio/checkbox controls (plain `fireEvent` doesn't reliably
  exercise their pointer-event-based interaction model). Installing it also surfaced that
  `@testing-library/dom` (a peer dependency of `@testing-library/react`) wasn't actually
  present in `node_modules` despite `--legacy-peer-deps` installs succeeding silently until
  now - added it explicitly rather than relying on peer resolution.

### Verification

- Full quality loop green: `typecheck && lint && test:coverage && build`. 74 tests total (10
  new UI tests), 100% coverage maintained on `src/lib/calculators/`.
- UI tests: `contractor-take-home-results.test.tsx` (disclaimer renders verbatim, financial
  year shown, `aria-live="polite"` region, HELP line conditionally rendered) and
  `contractor-take-home-calculator.test.tsx` (three validation-rejection cases with real
  typed input, one full form→engine→rendered-breakdown integration test reusing the
  $112,358 golden value from `contractor-take-home.test.ts`, one HELP-toggle integration
  test) - all using `userEvent` for real typing/clicking, not just `fireEvent`.
- **Stated gap, as in Day 2**: this environment has no browser/Playwright tool, so an
  authenticated real-browser click-through of `/calculators/contractor-take-home` (behind
  `proxy.ts`) wasn't done. The RTL integration tests above do exercise the real component
  tree, real Zod validation, and real engine computation end-to-end in jsdom - meaningfully
  more than a build check - but they don't replace an actual browser session. Day 9's
  Playwright suite is the plan to close this for good.

## Day 5 — Property Cash Flow + Div 293 Calculator Pages (2026-07-12)

Reused the Day 4 pattern exactly (three-generic `useForm` for coerced numbers, enclosing-label
pattern for radio/checkbox, client component + direct pure-engine import, no persistence,
non-dismissable calculator-variant `Disclaimer`, `aria-live="polite"` results, financial year
shown). No `CalculatorPage` factory or other shared abstraction was introduced - three
calculators now exist and each page is still just a form component + a results component;
revisit only if a fourth calculator makes the duplication actually painful.

### Engine changes (two deliberate signature changes to already-shipped Day 3 engines)

- **`calculatePropertyCashFlow`**: replaced `otherTaxableIncome` with `marginalTaxRate` as
  the input. This task wanted the UI to offer a marginal-rate **select populated from config
  brackets**, not a free-text income field - and there's no single income value that
  correctly represents an entire bracket, so translating a selected rate back into a fake
  income would have been backwards. Removed the engine's dependency on `marginalRateAt` in
  the process (it now just uses the caller-supplied rate directly). Updated
  `property-cash-flow.test.ts` to pass rates directly - all four existing tests kept the same
  expected values, since the rates themselves didn't change, only who computes them.
- **`calculateDiv293`**: renamed `Div293Input.taxableIncome` → `div293Income`, matching this
  task's explicit instruction to mirror `calculateHelpRepayment`'s `repaymentIncome` pattern.
  This isn't just a rename: the field's *meaning* changed. Previously the JSDoc documented
  "combined income does NOT include reportable fringe benefits or net investment losses" as a
  v1 limitation. Now `div293Income` is documented as a value the **caller** must already
  compute inclusive of RFB/investment losses (concessional contributions stay a separate
  field, added by the engine, so they aren't double-counted). Also added `div293Income` to
  `Div293Result` (echoed back) - needed so the results UI can distinguish "income alone is
  already over the threshold" (above) from "contributions are what push it over" (straddle)
  without the caller having to hold onto the original input separately; `IncomeTaxResult`
  already echoes `taxableIncome` back for the same reason, so this matches an existing
  pattern rather than inventing a new one.
- `marginalRateAt` (added Day 3 for the old `otherTaxableIncome` approach) now has no
  caller in the app - only its own tests exercise it. Kept rather than deleted: it's small,
  fully tested, and a plausible fit for a future "your marginal rate is X%" display (e.g. the
  Day 6 tax profile summary). Flagging here rather than quietly leaving it - worth
  reconsidering for removal if it's still uncalled after Day 7.

### Built

- **`/calculators/property-cash-flow`**: weekly rent + vacancy weeks (default 2) →
  annualized rent; four separate expense fields (rates/insurance/management/maintenance,
  no dynamic row builder) summed to `annualExpenses` in the component; loan interest;
  depreciation (helper text: "from a quantity surveyor's depreciation schedule - not a
  guess"); marginal rate via a **native `<select>`** populated from
  `fy2025_26.incomeTaxBrackets.value` (see deviation below). Results: pre-tax cash flow, tax
  effect, after-tax cash flow, each annual + per week; a plain-language negatively/positively
  geared explanation; and the CGT/land tax/borrowing-cost-amortization exclusions listed
  as their own labelled block ("This estimate does not include:"), not buried in the
  assumptions disclosure.
- **`/calculators/div-293`**: `div293Income` (helper text explains it's broader than
  taxable income, and explicitly says not to include concessional contributions there) +
  concessional contributions. Results render one of three mutually exclusive, explicitly
  worded states (`below` / `straddle` / `above`) rather than a single generic message - the
  straddle case (income alone under $250k, but income + contributions over) gets its own
  paragraph naming both figures and explaining *why* combined income differs from income
  alone, since that's the case the task flagged as the one users get wrong.
- **`/calculators`**: replaced the placeholder stub with a 3-card grid (n=3, so no
  search/filter/category scaffolding was built).

### Deviations

- **Native `<select>` instead of shadcn's `Select` component** for the marginal-rate
  picker. shadcn's `Select` here is a portal-rendered, pointer-capture-driven `@base-ui/react`
  component - exactly the kind of thing that's notoriously flaky to drive in jsdom without
  extra polyfills (`PointerEvent`, `hasPointerCapture`, `scrollIntoView`, etc.), and this task
  needs real integration tests, not skipped/mocked ones. A native `<select>` still satisfies
  "select populated from config brackets, not free-text" exactly, works immediately with
  `register()` and `userEvent.selectOptions`, and needs no portal. Noting this as a deliberate
  choice, not an oversight - the styled `Select` remains available in
  `src/components/ui/select.tsx` for anything that isn't test-critical.
- Property cash flow's "per week" figures divide by a flat 52 (not "weeks let" or a
  vacancy-adjusted denominator) - it's smoothing the whole year's result over the whole
  year, matching how "per week" reads on a bank statement, not how many weeks had a tenant.

### Verification

- Full quality loop green: `typecheck && lint && test:coverage && build`. 91 tests total (17
  new UI tests across property-cash-flow and Div 293), 100% coverage maintained on
  `src/lib/calculators/`.
- **The `-0` regression, tested at two levels, not just asserted**: (1)
  `property-cash-flow-results.test.tsx` feeds the results component a hand-verified
  exact-zero engine result (`Object.is(data.taxEffect, -0)` asserted `false`) and checks no
  `-$0` string renders; (2) `property-cash-flow-calculator.test.tsx` drives the **actual
  form** with numbers chosen so rent exactly equals expenses+interest+depreciation, proving
  the full form→engine→component pipeline - including the results component's own
  `annual / 52` arithmetic, a second place `-0` could sneak back in - never reintroduces it.
- **Negative cash flow correctness**: the property calculator's own default form values
  happen to produce a real negative pre-tax cash flow (-$2,500/year) and a loss
  (-$8,500 net rental result) - used as the golden integration-test scenario rather than
  constructing an artificial one, and cross-checked against hand-computed arithmetic in the
  test's own comment.
- **Div 293 straddle state**: tested at both the results-component level (three states,
  each asserted mutually exclusive via `queryBy`/negative assertions) and via a full
  form-driven integration test with `div293Income: 230,000` / `concessionalContributions:
  25,000` (income alone under $250k, combined $255k over it).
- One test-only false alarm caught and fixed, not a product bug: an initial straddle-state
  assertion (`/is below/i`) failed because Testing Library's default `getByText` matcher only
  concatenates an element's *direct* text-node children, not text nested inside a `<strong>`
  - so "is" and "below" (wrapped in `<strong>`) never appear in the same matched string even
  though a reader sees them as one continuous phrase. Simplified the assertion rather than
  restructuring the JSX around a test-tooling quirk.
- Same stated gap as Days 2/4: no browser/Playwright tool in this environment, so real
  authenticated click-through wasn't done; RTL integration tests exercise the full
  component→Zod→engine pipeline in jsdom, which is the strongest verification available here.

## Day 6 — Carry-over Fix + MDX Content Pipeline (2026-07-13)

### Carry-over: property calculator exclusion (5 min)

Added "assumes your marginal tax rate stays unchanged by this property's income or loss" to
`PropertyCashFlowResults`' explicit exclusions list (`src/components/calculators/property-cash-flow-results.tsx`)
— the engine takes `marginalTaxRate` as a fixed input (Day 5's deviation) and never re-derives
it from the property's own result, so this is a real, previously-unstated assumption, not just
wording. One new test asserting the line renders (`property-cash-flow-results.test.tsx`).

### Toolchain decision: `next-mdx-remote/rsc` + `gray-matter`, not `@next/mdx`

`@next/mdx` turns each `.mdx` file into its own route/page component (a webpack/Turbopack
loader over file-system routing) - it has no built-in way to enumerate frontmatter across many
articles for a single dynamic `/tips/[slug]` route and a grouped `/tips` index. `next-mdx-remote/rsc`'s
`compileMDX` compiles a raw MDX string (read from `content/` at request/build time) into a React
element inside a Server Component, which fits this app's "one dynamic route, one index page,
build-time content" shape directly. `gray-matter` (already the de facto standard, 4KB, zero
heavy deps) does frontmatter extraction for both the app's content loader and the standalone
validation script, so there's exactly one parser for frontmatter in the codebase. Two new
dependencies, justified per the Simplicity First rule rather than reaching for a CMS or
`contentlayer` (unmaintained, doesn't support Next 16).

### Built

- **`src/lib/content/schema.ts`**: `articleFrontmatterSchema` (Zod) + `ArticleFrontmatter` type
  - `title`, `description` (≤160 chars), `slug` (kebab-case), `category` (enum, matches the four
    v1 categories), `financialYear` (`"2025-26"` shape), `reviewDate` (`z.iso.date()`),
    `sources` (min 1, `{ label, url }`), `tags` (optional), `draft` (boolean). No `author`, no
    `heroImage` - neither has a consumer.
  - `isReviewDateStale(reviewDate, asOf?)`: stale strictly after the 12-month anniversary date
    of `reviewDate`, not a whole-calendar-months count (avoids day-of-month edge cases). Wired
    into the schema via `.refine()` so a stale `reviewDate` is just another schema validation
    failure, not a separate code path. `createArticleFrontmatterSchema(now?)` factory makes
    `now` injectable for tests; `articleFrontmatterSchema` is the real-clock production
    instance.
- **`src/lib/content/articles.ts`**: `getAllArticles()` / `getAllArticleSlugs()` /
  `getArticleBySlug()`. Reads `content/<category>/*.mdx` via `node:fs`, parses with
  `gray-matter`, validates with the schema (throws on a bad file - no silent fallback), filters
  out `draft: true`. Re-reads the small content tree on every call rather than caching; revisit
  only if the article count grows enough to matter (still n<10 here).
- **`/tips`** (`src/app/(marketing)/tips/page.tsx`): replaced the Day 2 stub. Groups published
  articles by category (skips a category heading entirely if it has zero articles, e.g.
  wealth-preservation for now), title + description per article, no search/pagination/tag
  filtering per instruction (n=3).
- **`/tips/[slug]`** (`.../tips/[slug]/page.tsx` + `layout.tsx`): `generateStaticParams` over
  published slugs (all 3 seed articles prerendered at build time - confirmed in the build
  output below, not just claimed). Page renders the FY badge, "Reviewed: <date>", the MDX body
  via `compileMDX`, and a "Sources & further reading" list. **The disclaimer is injected by
  `layout.tsx`**, not the page - an MDX article file has no mechanism to render its own layout,
  so it structurally cannot omit or paraphrase it, which is a stronger guarantee than "authors
  are asked not to."
- **`npm run validate:content`** (`scripts/validate-content.ts`): parses every `content/**/*.mdx`
  frontmatter against the same schema the app uses, plus two checks a schema alone can't
  express: (1) filename must equal `frontmatter.slug`, and the containing folder must equal
  `frontmatter.category` - a cheap catch for copy-paste mistakes across articles; (2) the
  article body must not contain the standard disclaimer text - the layout already injects it,
  so a duplicate copy in an MDX file would both violate "never weaken/paraphrase the
  disclaimer" (by inviting drift between the two copies) and look redundant to a reader. Exits
  1 with a per-file error list on any failure, 0 with a pass count otherwise. Wired into
  `.github/workflows/ci.yml` (right after lint) and into `CLAUDE.md`'s quality-loop line.
- **3 seed articles** (`content/<category>/<slug>.mdx`, 300-500 words each, plain-language,
  educational framing, no "you should claim" language, explicit eligibility/scope caveats,
  real ATO source URLs - reusing the exact superannuation URL already verified in
  `fy2025-26.ts` for consistency):
  - `contractor-expenses/claiming-work-related-expenses-as-a-contractor.mdx` (434 words)
  - `property-deductions/repairs-vs-improvements-rental-property.mdx` (437 words)
  - `superannuation/concessional-contributions-cap-explained.mdx` (386 words)

### Deviations

- **Seed articles marked `draft: false`, not `draft: true`.** CLAUDE.md's v1 scope (module 4)
  says "all articles ship `draft: true` until the Day 8 human gate approves them" - this Day 6
  message explicitly instructed `draft: false` "as pipeline-proving placeholders" with content
  review logged as owed before public launch. Followed the newer, explicit instruction (same
  precedent as Day 3's restructuring) rather than silently reverting to `draft: true`, and
  updated CLAUDE.md's module 4 description to say so. **Flagging for Gate 2**: these three
  articles have not had the ATO-guidance review Gate 2 calls for - they exist to prove the
  pipeline (schema, validation, rendering, staleness enforcement) works end-to-end, not as
  reviewed public content. Do not treat their presence as content sign-off.
- **`draft` has one consumer today** (the content loader filters it out of `getAllArticles()`,
  so a future `draft: true` article is built but not listed/reachable) - no admin UI or preview
  route was added for viewing a draft article directly, since nothing in this task asked for
  one and there's no reviewer-facing surface yet to put it in.
- **`tsconfig.json`**: added `allowImportingTsExtensions: true`. `scripts/validate-content.ts`
  imports `../src/lib/content/schema.ts` and `../src/lib/disclaimers/index.ts` with explicit
  `.ts` extensions, which Node's native TypeScript support (enabled by default on this
  project's Node 24) requires for relative specifiers, but which `tsc` rejects by default under
  `moduleResolution: "bundler"` unless this flag is set. Safe here because `noEmit` is already
  `true` project-wide - this flag only affects what import specifiers typecheck, not what Next
  emits.
- **No `ts-node`/`tsx` dependency added** for the validation script - Node 24 (this project's
  pinned CI/dev version) runs `.ts` files natively via type-stripping, so `scripts/validate-content.ts`
  runs directly (`node --no-warnings scripts/validate-content.ts`). `--no-warnings` only
  suppresses a cosmetic "module type not specified" perf warning; it changes no behavior.

### Verification

- Full quality loop green: `typecheck && lint && validate:content && test:coverage && build`.
  129 tests total (38 new: 14 schema, 6 content-loader, 7 validate-content script
  integration tests via real `spawnSync` child processes against fixture directories, 1
  carry-over property-calculator test, 1 article-layout test, 5 article-page tests, 4 index-page
  tests), 100% coverage maintained on `src/lib/calculators/`.
- **Build output confirms build-time compilation, not just claimed**: `next build` shows
  `● /tips/[slug]` (SSG) with all three seed slugs individually listed as prerendered, and `○
  /tips` static. Inspected the prerendered HTML for one article directly (not just the RTL
  test) and confirmed the disclaimer text, "Reviewed:", "Sources", and the real ATO source URL
  all appear in the shipped output.
- **Stale-reviewDate boundary tested at the day level**, per the "every threshold needs a
  boundary test" habit from the calculators: exactly at the 12-month anniversary (not stale),
  one day after (stale), one day before (not stale).
- **validate:content script tested as a real subprocess**, not just its internals: each test
  spawns `node --no-warnings scripts/validate-content.ts` against a fresh temp fixture directory
  (via `VALIDATE_CONTENT_DIR`, a test-only env override - unset in every real invocation) and
  asserts the actual exit code and stderr/stdout text for: all-valid, schema failure,
  slug/filename mismatch, category/folder mismatch, stale reviewDate, and disclaimer
  duplication.
- Same stated gap as prior days: no browser/Playwright tool in this environment, so a real
  authenticated-or-not click-through of `/tips` and `/tips/[slug]` wasn't done in a live
  browser; the RTL tests render the actual page/layout component tree and the build output was
  inspected directly, which is the strongest verification available here.

## Day 6.5 — Design Alignment with FamilyFlux Theme (2026-07-13)

### What this was

An external design reference (`DESIGN-THEME.md`, a portable design-token doc extracted from a
different product called FamilyFlux) was adopted as TaxOps' design system. Token architecture
and light palette only — see Divergences below for what was deliberately not carried over.
Full non-negotiables, token tables, and rationale now live in `docs/design.md`; the source doc
is preserved verbatim at `docs/design-theme-source.md` for provenance.

### Built

- **Token architecture** (`src/app/globals.css`): replaced the shadcn OKLCH default palette with
  RGB-channel CSS custom properties (`--accent: 79 70 229`) wired through Tailwind v4's `@theme`
  as `rgb(var(--x) / <alpha-value>)`, so opacity modifiers work (`bg-accent/60`). Every existing
  shadcn slot name (`primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `popover`,
  `border`, `input`, `ring`, `sidebar-*`) is aliased onto the same channel vars as the new
  FamilyFlux-named tokens (`bg`, `surface`, `textPrimary`, `accentSubtle`, `dangerFg`, etc). The
  Day 6 audit (this task's own recon pass) found **zero hardcoded colors anywhere in `src/`
  outside `globals.css` already** - every component was already semantic-class-only - so the
  re-skin propagated automatically to every primitive (input, dialog, dropdown, select, tabs,
  table, checkbox, radio-group, avatar, separator, skeleton, sonner, form-field, label) with no
  per-component edits needed beyond the three below.
- **`@custom-variant dark`** retargeted from `.dark` (shadcn default) to `[data-theme="dark"]`
  (the FamilyFlux architecture) but **no dark token values were added and nothing sets
  `data-theme`** - dark mode is wired-but-inert, cheap to finish later, not shipped now.
- **Button, Card, Badge** (`src/components/ui/{button,card,badge}.tsx`) rewritten to the source
  doc's literal component patterns (existing `variant` prop values kept so no call site broke):
  Button's `default`/`secondary`/`outline`/`ghost`/`destructive`/`link` remapped to
  primary/bordered-neutral/ghost/danger/link per spec; Card gained `variant="elevated"`
  (`shadow-raised`) and `variant="interactive"` (hover lift + `tabIndex=0`) on top of the base
  `rounded-lg border border-border bg-surface` pattern; Badge became the spec's Pill
  (`rounded-full`, subtle-bg/OnSurface-text pairs).
- **Global focus ring**: `*:focus-visible { outline: 2px solid accentOnSurface; outline-offset:
  2px; }` in `globals.css`, replacing per-component `ring-*` focus classes on Button/Badge/
  `app-sidebar.tsx`. Base UI internals that deliberately suppress the outline for their own
  bg-highlight focus treatment (dialog content, dropdown/select items) were left alone - that's
  an established listbox/menu pattern, not something this task's focus-ring rule was written to
  override.
- **Typography**: switched `next/font/google` from `Geist` to `Inter` (`display: "optional"`),
  and fixed a latent bug found during recon - the inherited shadcn theme had `--font-sans: var(--font-sans)`,
  a circular self-reference that meant the `font-sans` utility was silently falling back to
  Tailwind's default stack and the loaded font was never actually applied. Now
  `--font-sans: var(--font-inter)`. `tabular-nums` added to every money-figure `<dl>`/`<p>`
  across the three calculator results components (`contractor-take-home-results.tsx`,
  `div-293-results.tsx`, `property-cash-flow-results.tsx`).
- **`<Disclaimer />`** (`src/components/disclaimer.tsx`): was plain muted text
  (`text-muted-foreground`, 4.59:1 - borderline for its own use as body copy), which the task's
  guardrail called out as not-necessarily-prominent-post-reskin. Rewritten as a bordered/tinted
  box (`bg-neutralSubtle`, `footer` variant additionally `border border-border`) with a
  `lucide-react` `Info` icon, so prominence comes from shape + icon + text, not color alone
  (CLAUDE.md's colour-never-sole-signifier rule). Wording, the fixed-prop API (no free-text
  override), and the exact text node the existing test suite matches on (`getByText(STANDARD_DISCLAIMER)`)
  were all preserved untouched.
- **`docs/design.md`**: the five non-negotiable rules verbatim, the light token table with
  contrast notes, the dark token table under "specified, not implemented", component-pattern
  mapping, and the Divergences section (below, condensed).

### Deviations / Divergences from the source doc

- **Dark mode deferred** (architecture-ready, zero token values, no toggle) - v1 has no
  requirement for it, and shipping it means re-testing every surface pair plus the glass/glow
  system, which is real scope with no near-term payoff. Glass/glow deferred with it (dark-only
  in the source, no light-mode equivalent worth building alone).
- **`secondary` (orange-700) reassigned.** Source role was "growth metrics, near-limit
  warnings" - directly overlapping TaxOps' existing `warning` (amber) semantic. Reassigned to
  property-figure highlighting (distinct from `accent`, used for contractor-income figures);
  `warning` now owns all caution/near-limit semantics exclusively. No live consumer of
  `secondary` yet (first property-calculator UI to need a highlight color gets it) - the one
  existing `Badge variant="secondary"` usage (an FY tag on tip articles) was moved to `outline`
  since a financial-year label isn't a property figure and would have been visually misleading
  painted orange.
- **Font: `next/font/google` Inter, not self-hosted `next/font/local` woff2.** No font binary
  asset exists in the repo and this task's instruction was explicitly "no new runtime
  dependencies" - `next/font/google` already downloads and self-hosts at build time (confirmed
  by the Geist setup it replaced actually building successfully in this environment), so the
  property the source doc cares about (preload + fallback-metrics, no render-blocking external
  request at runtime) holds even though the delivery mechanism differs from the letter of the
  spec.
- **Motion/`data-state` note turned out to be a non-issue, not a translation task.** The source
  doc references "Radix `data-state` enter/exit animations," but this shadcn version runs on
  `@base-ui/react`, whose primitives already emit `data-open`/`data-closed`/`data-popup-open`
  (confirmed directly in `dialog.tsx` and `dropdown-menu.tsx`), and `tw-animate-css` already
  targets those attributes. Nothing needed changing - recorded in `docs/design.md` in case a
  future hand-rolled primitive targets the wrong attribute set.
- **Text-on-subtle contrast for success/warning/danger/neutral pills not independently
  verified** - the source doc gives explicit ratios for accent/secondary text-on-subtle pairs
  but not for the other four; TaxOps followed the same 700-on-50 convention without measuring.
  Flagged in `docs/design.md` for a follow-up audit before leaning on those pairs for anything
  beyond decorative pill backgrounds.

### Verification

- Full quality loop green: `typecheck && lint && validate:content && test && build` - all 129
  existing tests pass unmodified (none needed updating: the disclaimer test matches on the
  literal text node, which was preserved; no test asserts on specific class names or colors).
- Grepped for raw hex/`oklch()`/`rgb()` literals and Tailwind default color-scale utilities
  (`bg-red-500` etc.) across `src/` and `content/` outside `globals.css`, and for `style={`
  outside the pre-existing Sonner CSS-var passthrough: all zero, confirming the "raw hex lives
  only in the token file" rule held through the whole re-skin.
- `next build` output confirms the app compiles and every route still prerenders/serves
  correctly (static marketing/auth pages, dynamic app/calculator routes, the 3 SSG tip
  articles) with the new token set and font.
- **Gap, stated explicitly rather than glossed over**: no browser/Playwright tool available in
  this environment (same gap as every prior day), so the re-skin was not visually inspected in
  a live browser - no screenshot, no manual click-through of focus states, hover states, or the
  boxed Disclaimer's actual rendered appearance. Typecheck/lint/tests/build passing verifies the
  code is correct and wired together; it does not verify the result *looks* right. Flagging this
  as the one thing still owed before treating this reskin as done, not just built.

## Day 7 — Guided Tax Profile Interview (2026-07-13)

### Ground truth read first, and a real schema-design finding

Read the Day 1 `profiles` migration and Day 2 RLS setup before designing anything, per
instruction. Grepped `src/` for any application code touching the existing profile columns
(`employment_type`, `business_structure`, `investment_property_count`,
`super_contribution_habit`, `expense_categories`, `other_income_sources`) - **zero hits**. The
Day 1 table was a placeholder scaffold (matching CLAUDE.md's module-1 description verbatim) that
nothing had built against yet, which made this a schema *correction*, not a purely additive
migration:

- `employment_type` was `NOT NULL` and could only be `payg`/`abn`/`both` - both violate this
  day's principles (full skippability; distinguishing PAYG employee from PAYG contractor).
  Dropped from `profiles`; the `employment_type` *type* itself is kept since
  `checklists.profile_type` still uses it.
- `business_structure` and `super_contribution_habit` (columns *and* their enum types) dropped
  entirely - no consumer today (Privacy rule: no speculative columns). `super_engagement`
  (this day) replaces `super_contribution_habit`'s role with different wording/values.
- `expense_categories` dropped - no consumer wired today either (checklist item selection is a
  future day). Re-added later with its own migration once a real consumer exists.
- `investment_property_count` (exact `smallint`) replaced by `investment_property_band` (banded
  enum: 0/1/2-3/4+) - the brief's own privacy-minimizing principle explicitly calls for banded
  ranges, even though a small count alone wouldn't have been too sensitive on its own.
- `other_income_sources` changed from free-form `text[]` to a real `other_income_source[]` enum
  array - matches the Day 1 migration's own stated intent ("the DB enforces valid values via
  enums/arrays") for the first time.

Every new column is nullable, no defaults except `other_income_sources` (`'{}'::other_income_source[]`,
matching its prior default) - `null` means "not answered", distinct from any answered value,
which is what makes profile completeness a derived count rather than a gate.

**Real migration bug hit and fixed**: `alter column ... type other_income_source[] using ...`
failed with `default for column "other_income_sources" cannot be cast automatically` - Postgres
won't auto-cast a column's *default expression* during a type change even with an explicit
`USING` clause for existing row data. Fixed by dropping the default, changing the type, then
re-adding the default with an explicit cast (`'{}'::other_income_source[]`).

### Verified against running Postgres, same as Day 2

Docker + `supabase start` were already available in this environment. `supabase db reset`
applied both migrations and the updated seed cleanly. Re-seeded the demo user (CLAUDE.md's
stated persona: PAYG+ABN mix, one investment property, $400-600k household income) with
`work_arrangement: 'mix'`, `has_abn: true`, `investment_property_band: 'one'`,
`super_engagement: 'making_concessional_contributions'`, `household_income_band: '250k_plus'`
(above the top band, matching the persona) - confirmed via direct `psql`/`docker exec` query,
not just "the reset didn't error."

Extended `scripts/smoke-test-rls.mjs` (also fixed its own now-broken `employment_type` insert
in the throwaway-user setup) with a third assertion beyond the existing anon/cross-user checks:
a partial upsert (`{ id, householdIncomeBand }`) updates only that column on the demo user's
real row and leaves every other column untouched, then restores the seed value for
idempotency. This is the exact mechanism the section-edit feature (below) depends on, verified
against live Postgres rather than assumed from Supabase's documented upsert semantics. **All 9
assertions passed** (2 anon, 4 authenticated-cross-user, 3 partial-upsert).

### Built

- **`src/lib/validation/tax-profile.ts`**: five Zod enums mirroring the Postgres enums exactly,
  `taxProfileSchema` (every field `.nullable().optional()`), and `TAX_PROFILE_QUESTION_GROUPS` -
  a single source of truth (key/title/description/type/options) driving the wizard, the summary
  view, and the review step, so option labels are never duplicated. A partial payload (e.g.
  `{ hasAbn: true }`) is already valid against this schema with no separate `.partial()` needed,
  since every field starts optional - this is what lets one server action cover both a full
  wizard submission and a single-section edit.
- **`src/lib/tax-profile/derived.ts`** (pure, no I/O - same discipline as `src/lib/calculators/`):
  - `computeProfileCompleteness` - counts answered groups (an empty `otherIncomeSources` array
    or an explicit `null` both count as unanswered; `false`/`"zero"` count as answered).
  - `getRelevantTipCategories` - a fixed lookup table keyed only on `workArrangement` +
    `investmentPropertyBand` (the two fields the brief named for this consumer), not a scoring
    engine: contractor-like arrangement -> contractor-expenses; any work arrangement answered ->
    superannuation; non-zero property band -> property-deductions; 2-3 or 4+ properties ->
    wealth-preservation also.
  - `suggestMarginalRateForIncomeBand` - looks up a representative income per household-income
    band (documented as a best-effort default, not a precise derivation - household income isn't
    the same figure as an individual's taxable income) and feeds it to the **existing**
    `marginalRateAt` from `src/lib/calculators/income-tax.ts` rather than inlining a new rate
    table - "never inline a tax rate" holds even for a UI-prefill helper, not just the
    calculator engines.
- **`src/lib/tax-profile/data.ts`**: `getTaxProfile` (row -> camelCase `TaxProfileInput`,
  `null` if no row yet) and `toProfileRow` (only maps keys actually present on the input object
  to their DB columns - the mechanism that makes partial saves partial).
- **`src/app/(app)/profile/actions.ts`**: `saveTaxProfileSectionAction` - re-validates with the
  same Zod schema server-side (Privacy rule: never trust client validation alone), checks
  `auth.getUser()` itself rather than relying on RLS alone to silently reject an unauthenticated
  write (RLS is the backstop, not the only gate - directly testable, unlike a silent RLS
  failure), then upserts. One action covers both the full-wizard save and every single-section
  edit - they're the same partial-input shape.
- **Wizard** (`src/components/tax-profile/tax-profile-wizard.tsx`): one `QuestionGroupControl`
  per step (radio group for single/boolean, checkbox list for multi - both using the
  enclosing-label pattern from Day 4, not `<Label htmlFor>`), a progress bar + `aria-live="polite"`
  step announcement, Back (disabled at step 0) / Next, focus moved to each step's heading on
  change (keyboard/screen-reader users land somewhere meaningful, not stranded), a
  review-and-confirm step with per-group Edit-jump-back, and a completion screen rendering
  `<Disclaimer variant="inline" />` alongside copy stating the profile organizes content only
  and never generates advice. No per-step validation gate exists to fight through, since every
  field is skippable by design - "Next" always works.
- **Summary/edit view** (`tax-profile-summary.tsx` + `tax-profile-section-editor.tsx`): once any
  answer exists, `/profile` shows a read view with a per-row "Edit" button that opens an inline
  single-field editor (same `QuestionGroupControl`, same server action, just one key) - directly
  satisfies "editing individual sections later without redoing the wizard." A "Redo the full
  interview" escape hatch reopens the wizard prefilled with current answers rather than blank.
- **`/profile`** (`page.tsx`, now a Server Component): fetches the profile, renders the wizard
  directly for a brand-new user (zero answers) or the summary view otherwise.
- **Consumers wired**:
  - **Tips** (`/tips`, now async): public route, so `getUser()` may return `null` - handled,
    not treated as an error. When a signed-in user has a profile with any relevant category, a
    "Relevant to you" section renders above the full category listing. Moved `CATEGORY_LABELS`
    out of the page into `src/lib/content/schema.ts` so it's not duplicated between this page
    and the dashboard.
  - **Property cash flow calculator**: the page (Server Component) computes a suggested marginal
    rate from the profile's household income band and passes it + the band's label into the
    (client) calculator as props; the form's `marginalTaxRate` `<select>` defaults to it and is
    labelled "Defaulted from your tax profile (household income: …) - edit if this doesn't
    match your individual marginal rate" - still a completely normal, editable default, not a
    locked value. Falls back to the calculator's own static default (30%) when there's no
    profile or no income band answered.
  - **Dashboard** (`page.tsx`, was a Day 2 stub): profile-completeness bar + link to `/profile`,
    the three calculator cards (reused from `/calculators` via an exported `CALCULATORS` const
    rather than a duplicated list) with a "From your profile" pill on the contractor take-home
    card when the work arrangement is contractor-like, and a "Relevant tips for you" row of
    category links (deep-linking to `/tips#category-<slug>`, since `/tips` already anchors each
    category section by id). Still no saved-scenarios, as instructed.

### Deviations

- **Dropped three existing columns and two enum types** (`business_structure`,
  `super_contribution_habit` + its type, `expense_categories`) rather than leaving them dormant.
  Justified above under "ground truth read first" - zero consumers, no defined consumer in this
  day's brief either, and CLAUDE.md's own Privacy rule 5 is explicit about not keeping
  speculative columns. Reversible via a future migration if a consumer for any of them shows up.
- **`hasAbn` is a genuinely separate question from `workArrangement`**, even though
  `workArrangement: 'abn_sole_trader'` already implies an ABN - kept both because the brief
  listed them as two distinct groups, and a real scenario (e.g. a PAYG employee with a small
  ABN side gig) makes them non-redundant in practice.
- **`getRelevantTipCategories` deliberately ignores `superEngagement` and `householdIncomeBand`**
  even though richer signals were available, to match the brief's literal instruction ("mapped
  from work arrangement + property count") rather than quietly expanding the lookup table's
  inputs.
- **Household-income-band -> marginal-rate mapping is a labelled best-effort default, not a
  precise figure** - household income (often a combined/broader figure) isn't the same number as
  an individual's taxable income, so a representative-point-per-band lookup against the real
  bracket table is the honest amount of precision here; documented in `derived.ts` and surfaced
  to the user via the "edit if this doesn't match" label rather than presented as computed fact.

### Verification

- Full quality loop green: `typecheck && lint && validate:content && test && build`. 184 tests
  total (55 new: 12 schema, 14 derived-logic, 5 server-action, 6 wizard incl. real keyboard-only
  navigation via `userEvent.tab()`/`keyboard()` - not just clicks, 4 summary/section-edit, 6
  tips-page incl. the new relevance section, 2 calculator-prefill, plus the extended live-DB
  smoke test run separately, not part of `npm test`).
- **Migration + RLS verified against a real running Postgres** (Docker + `supabase start`, both
  available in this environment) - see the ground-truth section above. Not simulated.
- **Gap, same as every prior day**: no browser/Playwright tool in this environment, so the
  wizard's actual visual appearance, hover/focus states, and a real authenticated click-through
  of `/profile` -> `/dashboard` -> a calculator with a live prefill were not seen in a browser.
  The RTL tests exercise the real component tree, real Zod validation, and (via the smoke test)
  real Postgres writes - the strongest verification available here - but that is not the same as
  having looked at it.

## Day 8 — EOFY Checklists (2026-07-13)

### Ground truth read first

Read the Day 1 `profiles`/`checklists`/`checklist_items` migration and Day 7's `getRelevantTipCategories` relevance lookup before designing anything, per instruction. Grepped `src/` for consumers of the Day 1 `checklists`/`checklist_items` tables (the DB-content-driven design: a `checklists` row per user with `checklist_items` rows holding the label text itself) - zero hits, same as every other Day 1 placeholder removed on Day 7. This design replaces that approach outright - checklist *content* is now typed code (`src/lib/checklists/templates.ts`), the database only stores per-user state - so both tables are dropped in this migration rather than left dormant next to the new ones (Privacy rule 5). `employment_type` was only kept alive on Day 7 because `checklists.profile_type` still referenced it; with `checklists` gone it has zero remaining consumers and is dropped too.

### Schema: one addition beyond the brief's literal shape, justified

Migration `20260713020000_eofy_checklists.sql` adds two tables:

- **`checklist_item_states`** (`user_id`, `item_id` text, `checked`, `checked_at`) - matches the brief exactly. Composite primary key `(user_id, item_id)`, no surrogate id, since that pair *is* the row's identity. `item_id` is the template's namespaced id (`${groupId}.${itemSlug}`, e.g. `property-documents.loan-statements`) - self-describing, so no join or separate `group_id` column is needed to know which group a state row belongs to.
- **`checklist_custom_items`** (`user_id`, `label`, `checked`, `position`) plus two additions beyond the brief's listed columns: a surrogate `id uuid` (needed so a specific custom item can be edited/deleted individually - the brief's literal shape had no primary key at all), and `group_id text` (not a foreign key - groups are code, not database rows - needed so the UI knows which group a custom item belongs to; without it every custom item would need to render in every group or a separate lookup table would have to exist, which is exactly the "database stores content" pattern this design is deliberately avoiding). `label` is check-constrained to 1-120 characters at the database layer, not just in Zod - a single short document name, never free-form notes, per the constitution's checklists-organize-don't-advise framing.

RLS on both tables: owner-only read/insert/update/delete, same grant convention as every other table (`authenticated` CRUD, `anon` nothing, `service_role` all). Both indexed on `user_id`.

### Real bug hit and fixed: zod's `z.uuid()` rejects "obviously fake" repeated-digit UUIDs

While writing the seed data and the RLS smoke test, used placeholder ids like `33333333-3333-3333-3333-333333333333` for the demo custom item - these are syntactically valid UUIDs but fail Zod v4's `z.uuid()`, which enforces the RFC 4122 variant nibble (`[89ab]` as the first character of the fourth group). A real `gen_random_uuid()` output always satisfies this, so no production row would ever hit it, but the seed's hand-picked literal did - meaning the demo user's seeded custom item would have silently failed to edit or toggle in the running app (`editCustomItemLabelAction`/`toggleCustomItemAction` both re-validate the id with `z.uuid()`). Fixed by using a shape-valid id (`33333333-3333-4333-8333-333333333333`, version nibble `4`, variant nibble `8`) in `seed.sql`, and hit the identical issue in the RLS smoke test's own fixtures - fixed there too. Documented inline at both call sites so a future placeholder id doesn't reintroduce it.

### Verified against running Postgres, same as Day 2 and Day 7

Docker + `supabase start` were available. `supabase db reset` applied all three migrations and the updated seed cleanly. Directly inspected the new tables via `psql`/`docker exec`: RLS enabled on both (`relrowsecurity = t`), both policy sets present, the old `checklists`/`checklist_items` tables and `employment_type` type confirmed gone, and the seeded rows present with the correct shape.

Extended `scripts/smoke-test-rls.mjs` with a fourth section (10 new assertions, 20 total): seeds a checklist item state and a custom item for the throwaway second user, then confirms the authenticated demo-user client (a) gets an RLS-filtered empty result reading the second user's `checklist_item_states`/`checklist_custom_items` rather than an error (consistent with how `profiles` cross-user reads already behaved), (b) an update/delete attempt against the second user's rows affects zero rows, verified via the admin client that the target row is genuinely unchanged, and (c) a targeted upsert against one `item_id` for the demo user leaves every other `item_id` row untouched - the same partial-write isolation Day 7 verified for `profiles`, now for a per-item-id table. All 20 assertions passed.

### Built

- **`src/lib/checklists/templates.ts`**: the five constitution-named groups (`contractor-income-expense`, `property-documents`, `super-contributions`, `receipts-evidence`, `agent-questions`) as typed data, each item with `id`/`label`/optional `helpText`, a single `CHECKLIST_TEMPLATE_FINANCIAL_YEAR` stamped at template level. Real, specific items per group (property: loan interest statements, depreciation schedule, agent statements, land tax/council/water rates notices, body corporate statements, purchase settlement statement, building insurance; similar depth for the other four groups) - plain language, no placeholder copy. `findTemplateItem`/`isChecklistGroupId`/`templateItemId` are the only way anything else in the app looks up or constructs a template id, so there's one namespacing convention (`${groupId}.${itemSlug}`) used everywhere.
- **`src/lib/checklists/select.ts`**: `getDefaultChecklistGroupIds`, a fixed lookup (not a scoring engine) reusing Day 7's `isContractorLikeArrangement` directly rather than re-deriving the rule. Contractor-like arrangement -> contractor group; non-zero property band -> property group; any super-engagement answer -> super group; `receipts-evidence` and `agent-questions` are always in the default set (general record-keeping and the agent-consult framing apply regardless of profile). No profile row, or a profile that hasn't answered any of the three fields this function reads, both fall back to every group. Once a question *is* answered its answer is trusted even when it doesn't add a group - `investmentPropertyBand: "zero"` is a real answer that keeps `property-documents` out of the default set, not a missing field that falls back to show-all - this took one iteration to get right (see Testing below).
- **`src/lib/checklists/derived.ts`**: `computeGroupProgress`/`computeOverallProgress`, pure functions over a group, an `itemStates` map, and a `customItems` array - checked/total/percent for a single group or a summed total across whichever groups are passed in (currently-visible ones, not necessarily every template group).
- **`src/lib/validation/checklists.ts`**: `customItemLabelSchema` (trim, 1-120 chars, generic non-content-echoing failure messages), `addCustomItemSchema`/`editCustomItemLabelSchema`/`toggleCustomItemSchema`/`deleteCustomItemSchema`/`toggleTemplateItemSchema`.
- **`src/lib/checklists/data.ts`**: `getChecklistItemStates` (row array -> `Record<itemId, checked>`) and `getChecklistCustomItems` (row array -> camelCase, silently dropping any row whose `group_id` doesn't match a current template group - can only happen if a future code change renames/removes a group, and hiding an orphaned item is safer than crashing the page over it).
- **`src/app/(app)/checklists/actions.ts`**: `toggleChecklistItemAction` re-validates the item id against the real template (`findTemplateItem`) before writing, not just "is it a non-empty string" - rejects a fabricated id before touching auth or the database. `addCustomItemAction`/`editCustomItemLabelAction`/`toggleCustomItemAction`/`deleteCustomItemAction` all re-check auth server-side (Day 7's pattern: RLS is the backstop, not the only gate) and scope every update/delete to `eq("user_id", auth.userId)` in addition to RLS. Every error path returns one of three fixed, generic messages - a custom item's label is never interpolated into a returned message, thrown, or logged, verified by a test that spies on `console.log`/`warn`/`error` across both a validation failure and a database failure and asserts neither fires and neither returned message contains the label content.
- **UI** (`src/components/checklists/`): `ChecklistsClient` (top-level state: item states, custom items, and `visibleGroupIds` starting at the profile-derived default set) renders one `ChecklistGroupSection` per visible group plus an "add other groups" affordance (buttons for hidden groups - client-only session state, not persisted, matching "affordance" rather than a saved preference) below. Template item checkboxes use the enclosing-label pattern from Day 4/7, toggle optimistically (state flips immediately, server action fires in the background, reverts on failure with the same generic error message), and an overall `aria-live="polite"` progress line announces changes as they happen. `CustomItemRow` handles a custom item's own optimistic toggle plus inline edit/delete; `AddCustomItemForm` validates client-side with the exact same Zod schema the server re-validates with, and the input also carries an HTML `maxLength` as a first line of defense (belt-and-suspenders, not a replacement for the server-side check).
- **`/checklists`** (`page.tsx`, Server Component): fetches profile + item states + custom items in parallel, computes the default group set, renders a low-pressure "complete your tax profile for a tailored view" prompt only when there's no profile row (profile organizes, never gates - every group is still fully visible and interactive without one), and `<Disclaimer variant="inline" />`. The `agent-questions` group's own title ("Questions for a registered tax agent") reinforces the consult-an-agent framing without needing separate disclaimer copy.
- **Dashboard**: a new "EOFY checklist" card (same progress-bar pattern as the existing "Tax profile" card) showing checked/total across the profile-derived default groups, linking to `/checklists`. The brief described this as replacing an existing stub link; the actual dashboard (built Day 7) had no checklist section at all yet, so this is additive rather than a replacement - noted here since it's a difference from the literal brief text, not a silent scope change.

### Deviations

- **`checklist_custom_items` gained a surrogate `id` and a `group_id` column beyond the brief's literal `(user_id, label, checked, position)` shape.** Justified above under Schema - without `id` no individual custom item could be targeted for edit/delete, and without `group_id` the UI would have no way to know which group a custom item belongs to short of re-introducing a database-stored grouping concept, which is exactly what this design's "templates are code, not DB content" principle rules out.
- **`getDefaultChecklistGroupIds` trusts every answered field, even a "negative" one like `investmentPropertyBand: "zero"`, rather than only reacting to fields that add a group.** Initially built it the other way (only "did this field select a group" counted as signal), which meant an explicit "0 investment properties" answer fell back to showing every group rather than correctly excluding `property-documents` - caught by a test written for the opposite case (payg_employee shouldn't show every group either) and fixed before this was ever run against a real profile.
- **The old Day 1 `checklists`/`checklist_items` tables and the `employment_type` type are dropped, not left dormant.** Same justification pattern as Day 7's profile-column drops: zero application consumers, and this day's design replaces the DB-content approach outright rather than extending it.

### Verification

- Full quality loop green: `npm run typecheck && npm run lint && npm run validate:content && npm test && npm run build`. 260 tests total (76 new across 9 files): template-copy lint (no "claim"/"you should"/"we recommend" anywhere in group titles, descriptions, item labels, or help text; every agent-questions item ends in "?"; every item id globally unique), `getDefaultChecklistGroupIds` profile-shape coverage, progress-calculation math, custom-item validation (length cap at exactly 120 and 121, whitespace-only rejection, trimming), server-action auth/ownership/error-shape coverage including the label-never-logged assertions, optimistic-toggle-with-reconciliation (both the transient checked state before the mocked action resolves and the reverted state after a mocked failure), add/edit/remove-custom-item flows, the empty-state prompt and profile-derived group visibility on `/checklists` itself, and the dashboard's checklist-progress card.
- **Migration + RLS verified against a real running Postgres**, not simulated - see the ground-truth section above; 20/20 smoke-test assertions passed, including the new cross-user denial and partial-write isolation checks for both tables.
- **Gap, same as every prior day**: no browser/Playwright tool in this environment, so the checklist page's actual visual appearance, hover/focus states, and a real authenticated click-through of check/uncheck, add-other-groups, and custom-item add/edit/delete were not seen in a live browser. The RTL tests exercise the real component tree (including a real `@base-ui/react` checkbox and its `role="checkbox"`/`aria-checked` output), real Zod validation, and (via the smoke test) real Postgres writes - the strongest verification available here - but that is not the same as having looked at it.

## Day 9 — Playwright E2E + Visual Verification (2026-07-13)

The gap every single prior day's PROGRESS.md flagged ("no browser/Playwright tool in this
environment") closes today. First real click-through of the app in a live browser, and it found
real bugs - some cosmetic-sounding but one is the most significant defect shipped so far (see
below).

### Precondition + setup

Docker Desktop + `npx supabase start` already running from prior days. Playwright
(`@playwright/test`) was already a devDependency (Day 1 scaffold); `@axe-core/playwright` added
today as the one new devDependency this task explicitly sanctioned, for the WCAG A/AA scans.

- **`playwright.config.ts`**: `webServer` switched from `npm run build && npm run start`
  (production) to `npm run dev` (Turbopack dev server), per this task's explicit instruction to
  run against `next dev` + local Supabase, not a production build. A `setup` project
  (`e2e/auth.setup.ts`) runs before the single `chromium` project (Chromium only for v1, per
  instruction - no cross-browser matrix), wired via `dependencies: ["setup"]`.
- **`e2e/lib/supabase-admin.ts`**: `createE2ESupabaseAdminClient()` resolves the local Supabase
  URL/service-role key from env vars if set (CI's path), otherwise shells out to
  `npx supabase status -o json` (local-dev convenience - this runs on every e2e invocation,
  unlike `scripts/smoke-test-rls.mjs`'s one-off manual env-var requirement, so the extra
  convenience is worth it here). `seedE2EUser` creates/resets a dedicated
  `e2e-user@taxops.local` user via the service-role admin API (`email_confirm: true`), which
  bypasses email confirmation regardless of the project's `enable_confirmations` setting.
  `resetE2EUserData` wipes that user's profile/checklist rows back to a known-empty slate -
  exported separately so individual specs needing the wizard's *fresh* multi-step flow (not the
  summary/edit view `/profile` shows once any answer exists) can call it in their own setup.
- **`e2e/auth.setup.ts`**: seeds the E2E user, signs in through the real `/sign-in` form, then
  visits every route the suite touches once (dashboard, profile, all three calculators,
  checklists, tips + every article slug) before saving storage state to `e2e/.auth/user.json`
  (gitignored). That warm-up loop exists because of a real environment finding - see below.
- **Signup/signin specs run unauthenticated** via `test.use({ storageState: { cookies: [],
  origins: [] } })`, per instruction. Signup uses a fresh `e2e-signup-<timestamp>@taxops.local`
  throwaway email each run; local Supabase already had `enable_confirmations = false`
  (`supabase/config.toml`, set on Day 1) so no real mail provider dependency exists for that flow
  to complete - nothing needed changing there.
- **Serial execution (`workers: 1`, `fullyParallel: false`)**: every spec shares the *one* seeded
  E2E user's database rows - no per-test user provisioning was built (more infrastructure than
  this suite's size justifies). Specs needing isolation either reset state themselves
  (`resetE2EUserData`) or target something unaffected by other specs' mutations (the checklists
  spec uses the "Receipts & evidence" group specifically, since `ALWAYS_DEFAULT_GROUP_IDS`
  keeps it visible regardless of profile answers). Documented in `docs/e2e-testing.md`.

### Specs written (11 files, 26 tests, all green)

- `e2e/journeys/`: `signup.spec.ts`, `signin.spec.ts` (both → dashboard), `proxy-protection.spec.ts`
  (unauthenticated `/dashboard` → redirect with `redirectTo`; public `/tips` reachable),
  `profile-wizard.spec.ts` (full wizard walkthrough - skips the ABN step entirely, answers "0"
  investment properties explicitly, confirms, then immediately checks `/checklists` to pin
  yesterday's regression: the Property documents group is absent from defaults, not "0" falling
  back to show-everything), `calculators.spec.ts` (all three calculators: fill → itemized results
  → disclaimer, one numeric spot-check each via the dt/dd pairs - gross income $147,200,
  combined income $265,000, pre-tax cash flow -$2,500 - not re-derived golden files, both the
  results region and the disclaimer confirmed fully inside a 1280×1400 viewport via a real
  `boundingBox()` check, not just "present in the DOM"), `checklists.spec.ts` (toggle an item →
  reload → state persisted, restored after; add/edit/delete a custom item), `tips-article.spec.ts`
  (FY badge, sources list with a real ATO URL, the article layout's own structural disclaimer).
- `e2e/accessibility/`: `keyboard-wizard.spec.ts` (the *entire* wizard driven with real `Tab`/
  `Space`/`Enter` key presses, no mouse - skips two steps via Tab-past, answers two via keyboard
  selection, toggles one checkbox, reaches Confirm, checks a focused button's actual computed
  `outline` style is `solid`/non-zero-width - not just present in a stylesheet), `axe-scans.spec.ts`
  (`@axe-core/playwright`, WCAG 2.0/2.1 A+AA tags, on dashboard/contractor-calculator/wizard-step/
  checklists - all four now 0 violations, see findings below for what wasn't 0 originally).
- `e2e/visual/screenshots.spec.ts`: full-page PNGs of all 11 major surfaces (marketing home, both
  auth pages, dashboard, wizard step, all three calculators with results, tips index + article,
  checklists), committed under `e2e/screenshots/` as the review artifact this task asked for -
  not snapshot-diff tests (no flake budget for that in v1).

### Real bugs found and fixed - this is the actual payoff of the day

**1. Every custom color in the app was silently broken (the big one).** The very first
screenshot (`e2e/screenshots/01-marketing-home.png`) showed a completely monochrome app - no
accent color anywhere, and the primary "Get started" button was functionally invisible (no
background, no border, just floating text). Root cause, confirmed via
`getComputedStyle`: every `@theme` color mapping in `globals.css` was written as
`rgb(var(--accent) / <alpha-value>)` - a **Tailwind v3** convention where the `<alpha-value>`
placeholder gets substituted by the v3 plugin engine at build time. **Tailwind v4 (this
project's actual version, since Day 1) has no such substitution step**, so every one of the 27
affected `--color-*` variables computed as the literal, invalid string
`"rgb(79 70 229 / <alpha-value>)"`, which the browser silently rejects, falling back to nothing
(transparent background, default black text). This has been broken since Day 6.5's design
reskin - three days of screenshots would have shown it immediately, but that day explicitly
flagged "no browser tool in this environment, the re-skin was not visually inspected" as the one
gap left open. **Fixed** by dropping `/ <alpha-value>` from all 54 occurrences - Tailwind v4
generates opacity-modifier support (`bg-accent/60`) natively via `color-mix()` for any plain
color value, so no other change was needed. Confirmed via `getComputedStyle` before/after
(`rgba(0, 0, 0, 0)` → `rgb(79, 70, 229)`) and by re-capturing every screenshot.
**Zero unit/RTL test could have caught this** - jsdom doesn't evaluate real CSS custom property
resolution against Tailwind's compiled output the way a real browser does.
- **2. Every button had no visible keyboard focus indicator.** Day 6.5 added a global
  `*:focus-visible { outline: 2px solid accentOnSurface; }` rule specifically so components
  wouldn't need their own focus classes - but it was written inside `@layer base`. Tailwind v4's
  cascade layer order is `theme < base < components < utilities`, so *any* component's own
  Tailwind utility class in the `utilities` layer beats a `@layer base` rule outright, regardless
  of source order or specificity - and `Button`'s base classes include a blanket `outline-none`
  with no `focus-visible:` override of its own (unlike Checkbox/RadioGroupItem, which already
  had their own explicit focus-visible ring classes). Every button in the app - Calculate, Next,
  Confirm, Sign in, the lot - had `outline: none` and nothing to replace it. **Fixed** by moving
  the rule out of `@layer base` entirely (deliberately unlayered CSS beats every layered rule
  regardless of source order). Confirmed via the keyboard-only wizard spec reading the focused
  Next button's computed `outline-style`/`outline-width` directly.
- **3. Every Radio/Checkbox in the app had no accessible name at all** (axe:
  `aria-toggle-field-name`, WCAG 4.1.2, impact "serious" - 3 nodes on the contractor calculator, 5
  on the wizard's first step, 37 across the checklists page). `@base-ui/react`'s Radio/Checkbox
  both render a plain `<span role="radio"|"checkbox">`; the enclosing-label pattern used
  everywhere in this app (`<label><Control />text</label>`, adopted Day 4 for *toggling*) reliably
  makes the control clickable/keyboard-operable but does **not** give it an accessible *name* -
  the native `<label>`-association algorithm only computes a name from wrapped text for real
  labelable elements (input/button/select/etc), and base-ui's own internal
  `aria-labelledby` wiring for this pattern doesn't resolve to real content either. **Fixed** by
  adding an explicit `aria-label` (the same visible text) to every Radio/Checkbox usage across
  four files (`question-group-control.tsx`, `contractor-take-home-calculator.tsx`,
  `checklist-group-section.tsx`, `custom-item-row.tsx`). All four axe-scanned pages now report 0
  violations. **Side effect discovered while fixing**: with the explicit `aria-label` in place
  *plus* base-ui's own internal (now-resolving) `aria-labelledby`, both Playwright's and
  jsdom's `dom-accessibility-api` compute a doubled name ("PAYG employee PAYG employee") - a
  shared quirk in how both libraries handle that combination, not something axe flags and not
  something a real screen reader is expected to announce (aria-labelledby is supposed to fully
  override aria-label per spec, not concatenate). Adjusted the affected locators (this suite's
  own + one pre-existing unit test, `tax-profile-summary.test.tsx`) to substring/regex name
  matches instead of exact-string matches - documented inline at each spot.
- **4. A real React state bug, not just a test artifact**: the first wizard step logged a
  console warning in a real browser - "A component is changing the uncontrolled value state of
  RadioGroup to be controlled" - because `QuestionGroupControl` passed `value={undefined}` for
  an unanswered question, then a real string once one was picked. **Fixed** in
  `question-group-control.tsx`: unanswered now passes `""` instead of `undefined`, always
  controlled from mount. jsdom/RTL never surfaced this because React's dev-mode warning path
  isn't something the existing tests asserted against either way.
- **5. Two E2E-infrastructure findings, not app bugs**, worth recording since they'll bite again
  otherwise: (a) `next dev` (Turbopack) compiles each route lazily on first request, and a cold
  compile can take 30-60s+ - enough to blow past Playwright's 30s default test timeout on the
  very first spec to touch a given route. Fixed by bumping the suite's default timeout to 60s
  and having `auth.setup.ts` warm every route once up front. (b) `react-hook-form`'s uncontrolled
  `defaultValues` aren't present in the server-rendered HTML for the three calculator forms - the
  field starts empty and gets populated client-side after hydration. Filling a field immediately
  after `page.goto()` can race that populate step and double the value ("800" → "800800").
  `e2e/lib/form.ts`'s `fillNumberField` waits for the field to be non-empty first. (c) the
  Next.js Dev Tools floating button (dev-mode only) has the accessible name "Open Next.js Dev
  Tools", which is a substring match for `getByRole("button", { name: "Next" })` under
  Playwright's default non-exact matching - every "Next" button locator needed `exact: true`.
  All three documented in `docs/e2e-testing.md`'s "Known environment quirks" section.

### CI wiring

- `package.json`: `"e2e"` script renamed to `"test:e2e"` (matches this task's naming, and the
  convention `npm test`/`npm run test:coverage` already used). README/CLAUDE.md updated.
- `.github/workflows/ci.yml`: new `e2e` job (separate from the existing `quality` job) - installs
  the Supabase CLI (`supabase/setup-cli`), runs `supabase start`, installs Chromium
  (`--with-deps`), runs `npm run test:e2e`, uploads the Playwright HTML report and
  `e2e/screenshots/` as build artifacts (`if: always()`, so a failing run still leaves the
  report/screenshots inspectable). Needs a `CI_SUPABASE_SERVICE_ROLE_KEY` repository secret (the
  local Supabase CLI's fixed dev key - safe to store, it only ever points at an ephemeral
  CI-local Postgres instance). **Not verified against a real GitHub Actions run** - no CI access
  in this environment, same category of gap as every prior day's "not seen in a browser" note.
  Flagging this explicitly rather than claiming the workflow file is proven, only that it's
  written and reasoned through.
- `docs/e2e-testing.md`: full local setup/run instructions, the storage-state/auth model, why the
  suite runs serially, the screenshot workflow, and the environment quirks above.

### Deviations

- **`getDefaultChecklistGroupIds`'s "0 properties" behavior itself needed no fix** - Day 8's
  logic was already correct (confirmed by today's journey-level regression pin actually passing
  once the test itself was debugged into working order). The "regression" Day 9 was asked to pin
  was already fixed at the unit level Day 8; today adds the journey-level pin on top, per
  instruction.
- **Screenshots are evidence, not assertions** - deliberately no pixel-diffing/snapshot
  comparison, per this task's explicit "not snapshot-diff tests yet" scope note. Re-run
  `npx playwright test e2e/visual/screenshots.spec.ts` and re-commit the PNGs whenever a surface
  changes meaningfully.
- **No cross-browser matrix** - Chromium only, per instruction. Firefox/WebKit are not installed
  or configured; revisit only on explicit request.

### Verification

- Full quality loop green: `npm run typecheck && npm run lint && npm run validate:content && npm
  test && npm run build`. 260 unit tests unchanged in count, 100% coverage maintained on
  `src/lib/calculators/` (one existing test adjusted for the accessible-name duplication above,
  not a new test).
- **`npm run test:e2e`: 26/26 passed**, run clean (serially, no other Playwright/dev-server
  process competing for the port) after every fix above was applied - not just "passed at some
  point during debugging."
- **The screenshots themselves were inspected directly** (not just "the test passed") - this is
  what caught finding #1, which every automated assertion in the suite would have sailed past
  (nothing asserts on color; `toBeVisible()` is satisfied by a zero-opacity-difference invisible
  button just as much as a colored one).
- Every finding above was verified fixed by re-running the specific spec that caught it, then the
  full suite once more end-to-end.

## Day 10 — Deployment Prep: Vercel + Hosted Supabase (2026-07-13)

Scope: one staging environment, not a launch. Full steps in the new `docs/deployment.md`; this
entry covers what happened running them, what reality corrected, and what's still open.

### Carry-over from Day 9

- **`docs/design.md`'s stale token note fixed**: it still documented the *broken*
  `rgb(var(--accent) / <alpha-value>)` pattern as if it were correct, after Day 9 had already
  fixed the actual CSS to drop the placeholder. Updated the doc to match reality and added a
  "Tailwind v3→v4 divergence" callout so the mistake isn't repeated when porting other pieces of
  `design-theme-source.md`.
- **Screenshot review caught one artifact bug**: `e2e/screenshots/05-profile-wizard-step.png`
  was actually the tax-profile **summary** view, not the wizard step its filename promised - the
  screenshot spec didn't reset the shared E2E user's profile first, so whatever a previous spec
  in the same run left behind (an answered profile) made `/profile` render the summary/edit view
  instead. Fixed `e2e/visual/screenshots.spec.ts` to reset via `resetE2EUserData` first, same
  pattern as the wizard specs; re-ran the full suite (26/26 still green) and confirmed the
  regenerated screenshot actually shows step 1.

### GitHub repo (new prerequisite, not in the original Day 9 plan)

No git remote existed anywhere in this project before today - Day 9's CI workflow file had never
actually run. Created `https://github.com/Vishwas2018/taxops` (public, per instruction) and
pushed `main`. This is what made "verify the Day 9 e2e job actually runs on GitHub Actions" a
real, checkable thing today rather than a hypothetical.

### CI: two real bugs found on the very first Actions run, both fixed

1. **Missing anon key.** The `e2e` job's env block only set `NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` - `NEXT_PUBLIC_SUPABASE_ANON_KEY` was never wired in, so `proxy.ts`
   errored on every request (`requireEnv` throws). Added the local Supabase CLI's well-known
   fixed dev anon key directly in the workflow (not a secret - it's derived from the default
   local JWT secret every `supabase init` project starts with, same value `supabase status`
   prints on any machine).
2. **A genuinely flaky test, only on CI's shared runners.** `e2e/journeys/checklists.spec.ts`'s
   toggle-then-reload test failed intermittently (flipped between expecting `true`/`false` across
   retries) - the checkbox toggles optimistically client-side, then persists via a Server Action
   fired in the background; the test reloaded before that background write necessarily landed.
   Never reproduced locally (fast enough machine), reliable on GitHub's shared runners. Fixed by
   waiting for the actual POST round-trip (`page.waitForResponse`) before reloading, not just the
   optimistic DOM update.
3. Set the `CI_SUPABASE_SERVICE_ROLE_KEY` repository secret (same well-known local-dev value,
   see `docs/deployment.md` §8 for why this one is fine to store even though it's not sensitive).

**Result: both `quality` and `e2e` jobs green** at
`https://github.com/Vishwas2018/taxops/actions` - the first ever green CI run for this repo.

### Supabase staging: linked, migrated, RLS-verified

- `supabase link --project-ref wynknhwynlygfoytfywc` (project ref supplied by the human, created
  via the dashboard per `docs/deployment.md` §1 - project creation itself was not done by the
  agent).
- `supabase db push`: all three migrations (`20260712000000_init_schema.sql`,
  `20260713010000_tax_profile_interview.sql`, `20260713020000_eofy_checklists.sql`) applied
  cleanly, no errors.
- **Verification method changed from the plan**: `supabase db diff --linked` needs a local Docker
  shadow database, which hit the exact same flaky CloudFront image-pull issue Day 2 already
  documented for `studio`/`edge_runtime` - not a new problem, the same known environment quirk
  showing up in a new command. Used `supabase migration list --linked` instead (compares the
  remote applied-migrations table against local filenames, no Docker needed) - all three matched,
  no drift. `docs/deployment.md` §3 updated to recommend this method going forward.
- `scripts/smoke-test-rls.mjs` (Day 10's staging-safety refactor - see below) run against
  staging: **19/20 assertions passed.**

### Real finding: hosted Supabase grants `anon` far more than the migration intended

The one smoke-test failure: anon's `select` against `profiles` returned zero rows with **no
error**, where local returns a hard "permission denied." Investigated with
`supabase db query --linked` (read-only SQL against the linked project, no dashboard needed):

- `information_schema.role_table_grants` showed `anon` holding full
  `SELECT/INSERT/UPDATE/DELETE/...` on **all five** `public` tables, not the "anon gets nothing"
  state the Day 2 migration explicitly intended (and that holds true locally).
- `pg_default_acl` showed why: the hosted project has schema-level
  `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon, authenticated, service_role` set for
  both the `postgres` and `supabase_admin` roles in `public` - a **platform bootstrap default
  the local CLI's Docker image doesn't replicate**. Every `CREATE TABLE` in every migration
  silently inherits this, regardless of what the migration itself grants. Day 2's own note ("this
  Supabase version no longer auto-exposes new tables... without explicit GRANTs") turns out to
  describe *local* behavior only - the hosted platform never stopped auto-exposing.
- **Not a data exposure**: confirmed RLS is enabled on all five tables
  (`pg_class.relrowsecurity = true`, checked directly) and every authenticated-access assertion
  passed correctly (cross-user isolation, partial-upsert scoping). `anon` can issue the SQL, but
  has no `auth.uid()`, so RLS filters every row - same practical outcome (zero rows) as the local
  hard rejection, just a different mechanism.
- **Per this task's explicit instruction ("any drift... stop and report before improvising"),
  no fix was pushed.** Proposed migration (revoke the unintended grant + the default-privilege
  rule that would re-grant it to every future table) is written up in `docs/deployment.md` §4,
  awaiting sign-off - it's a grants-hardening change against a real hosted database with real
  auth users, not something to push unilaterally.

### `scripts/smoke-test-rls.mjs` made staging-safe

The script previously assumed `supabase/seed.sql` had already created `demo@taxops.local` with a
fixed id. Seed files never run against a hosted project (`db push` doesn't execute them, and
`seed.sql` is explicitly commented "local dev only, never run against a production project") -
running the script against staging as-is would have failed at the first sign-in. Changed it to
look up (or create, via the service-role admin API) the demo user and use whatever id it actually
gets, rather than a hardcoded `11111111-...`. Also pre-seeds the one `checklist_item_states` row
section 4's "untouched row" comparison needs. Verified this is a strict refactor, not a behavior
change: re-ran locally after the change, still 20/20 (staging's 19/20 is the grants finding
above, unrelated to this refactor).

**Cleanup confirmed**: `admin.auth.admin.listUsers()` against staging after the run shows exactly
one user, `demo@taxops.local` - the throwaway `rls-smoke-<timestamp>@taxops.local` second user
was properly deleted by the script's own `finally` block. No orphaned test users left behind.

### Hosted auth config: partially verifiable without dashboard access

Supabase's public `/auth/v1/settings` endpoint (readable with just the anon key, no dashboard
login needed) confirmed `"mailer_autoconfirm": false` - **email confirmation is ON**, matching
`docs/deployment.md` §5's requirement. Site URL and the redirect allowlist aren't exposed by that
endpoint (by design - GoTrue doesn't leak the full redirect allowlist to anonymous callers), and
no CLI/Management API read path was available in this environment either. Flagged in
`docs/deployment.md` §5 as needing the human's own dashboard confirmation once the Vercel URL
question below is settled - not assumed correct.

### Blocker, unresolved: Vercel Deployment Protection

Every URL tried for the connected Vercel project -
`taxops-zq0cyhorm-vishwas2018s-projects.vercel.app` (the one shared),
`taxops-vishwas2018s-projects.vercel.app` (hashless alias), `taxops.vercel.app` (404s, unclaimed)
- redirected with a `302` to `vercel.com/sso-api?...`. That's **Vercel's own Deployment
Protection / Vercel Authentication SSO gate**, not this app's `proxy.ts` - every curl hit
Vercel's edge network, never reached Next.js at all. This blocks every remaining check this task
asked for:

- Build success / `proxy.ts` route-protection verification on the deployed URL
- Env-leakage check on the deployed bundle
- The human's §9 browser smoke test (signup/confirm/wizard/calculator/checklist)

Per the same "stop and report" instruction as the grants finding, **did not attempt to work
around this** (no bypass token exists yet, and guessing at Deployment Protection settings on a
real Vercel project isn't this agent's call). Three options written up in `docs/deployment.md`
§6 for the human to choose from: turn protection off (simplest, reasonable for a disposable
staging project with no real user data yet), generate a Protection Bypass for Automation secret
for future automated checks, or confirm Production specifically is already unprotected and share
that URL if it differs from what's above.

### Deviations

- **GitHub repo creation wasn't in the original Day 9/10 plan** - added because CI verification
  and Vercel's Git integration both need one to exist. Confirmed with the human first (public,
  named `taxops`) rather than assumed.
- **`db diff --linked` replaced with `migration list --linked`** in the documented verification
  method, for the Docker/CloudFront reason above - a tooling substitution, not a scope reduction;
  both answer "did every migration apply."
- **The anon-grants finding and the Vercel Deployment Protection blocker are both reported, not
  fixed** - both are explicit "stop and report" cases per this task's own instructions, and both
  touch configuration on real hosted infrastructure that isn't this agent's to change
  unilaterally.

### Verification

- `npx supabase migration list --linked`: all three migrations match, no drift.
- `scripts/smoke-test-rls.mjs` against staging: 19/20 (the 20th is the reported grants finding,
  not a script bug - re-verified the script itself is correct by re-running it locally, still
  20/20 there).
- `admin.auth.admin.listUsers()` against staging: exactly one user (`demo@taxops.local`), no
  orphaned throwaway users.
- GitHub Actions: both `quality` and `e2e` jobs green at
  `https://github.com/Vishwas2018/taxops/actions`.
- **Not verified, blocked**: Vercel build success, `proxy.ts` behavior on the deployed edge
  network, env-leakage check on the deployed bundle, and the human's §9 staging smoke test - all
  four need the Deployment Protection question resolved first. Stated plainly rather than
  assumed passing.

## Day 10 continuation — Grants Hardening + Protected-Deploy Verification (2026-07-13)

### The 19/20, confirmed before anything else

Per instruction, checked first: the failing assertion in the prior entry's smoke-test run
("anon select was rejected (permission denied)", which instead returned zero rows with no
error) is exactly the grants finding already written up above, not a separate bug. No other
investigation needed there - moved straight to the fix.

### Grants hardening: `supabase/migrations/20260713030000_harden_data_api_grants.sql`

Revokes every privilege on all five `public` tables from `anon`/`authenticated`/`service_role`,
then re-grants exactly the explicit per-table privileges this project has always declared
(`select, insert, update, delete` for `authenticated`; `all` for `service_role`; nothing for
`anon`), then `alter default privileges in schema public revoke all on tables from anon,
authenticated, service_role` so no future migration's `create table` can silently inherit the
platform default again - explicit per-table grants are now mandatory going forward, matching the
convention every migration already followed anyway.

- **Applied locally**: `supabase db reset` (see the container-recovery detour below) - all four
  migrations applied cleanly.
- **Applied to staging**: `supabase db push` - applied cleanly; `supabase migration list
  --linked` confirms all four match, no drift.
- **Verified directly, not assumed**: re-ran `information_schema.role_table_grants` against
  staging post-migration - `anon` now has **zero rows** on any `public` table (was 35 rows: 7
  privilege types × 5 tables). Bonus tightening caught in the same query: `authenticated` lost
  the incidental `REFERENCES`/`TRIGGER`/`TRUNCATE` privileges the same platform default had
  leaked to it, now exactly `SELECT`/`INSERT`/`UPDATE`/`DELETE` as intended. `service_role`
  unchanged (`all`, as intended).

### `scripts/smoke-test-rls.mjs` extended: section 5, privilege-layer pins

Added 10 new assertions (2 per table × 5 tables): `anon` `select` **and** `insert` on every
`public` table must fail with Postgres error code `42501` (`insufficient_privilege`) specifically
- not just return an empty/RLS-filtered result, which would also happen if RLS alone were doing
the work with grants still wide open (the exact gap this migration closes). Pins the hardening
itself, not just its side effect.

**Result: 31/31 on both local and staging** (was 20/20 local, 19/20 staging before today).

### Real detour: local Supabase broke mid-session, root-caused and fixed

`supabase db reset` (needed to apply the new migration locally) failed pulling a newer Postgres
image tag (`17.6.1.141`) from the same flaky CloudFront path Day 2 and Day 9 both already hit,
and left `supabase_db_taxops` **removed entirely** mid-failure - `supabase status` came back
with "No such container." `supabase stop` (data safely preserved in the Docker volume) then
`supabase start` recovered it, but hit the *same* CloudFront flakiness again, this time
pulling `storage-api:v1.65.1`, repeatedly, across multiple retries.

**Root cause of why storage-api needed pulling at all**: nothing in `src/` uses Supabase
Storage (grepped, zero hits - matches v1 scope, no file-upload features). Disabled it in
`supabase/config.toml` (`[storage] enabled = false`), the same precedent Day 2 set for
`studio`/`edge_runtime` hitting this identical issue. Local stack started cleanly right after -
one fewer image in the pull path, one fewer thing this flaky network path can break.

**Second, smaller flake found and root-caused in the same session**: `npm run test:coverage`
intermittently failed one of `validate-content-script.test.ts`'s two subprocess-spawning tests
(`Test timed out in 5000ms` on a plain `spawnSync("node", ...)` call) - reproduced it running
*in isolation* (no concurrent Playwright/dev-server this time, unlike Day 9's version of this
same flake), which pointed at something more persistent than "another test process competing."
`docker ps` showed `supabase_vector_taxops` (a log-shipping sidecar, not needed for anything this
project does) stuck crash-looping (`Restarting (0) 38 seconds ago`). Stopped it directly
(`docker stop supabase_vector_taxops`); the same test went from ~29s/flaky to 4.3s/clean
immediately after, and the full suite passed clean right after that. Not fixed in
`supabase/config.toml` (unlike storage - `vector` has legitimate local-observability value and
its own restart loop looks like a separate, narrower Docker Desktop networking issue on this
machine rather than the same CloudFront pull failures), but worth knowing: **if this exact
"subprocess test times out, nothing else changed" symptom recurs, check `docker ps` for a
crash-looping container before assuming it's test flakiness.**

### Vercel Deployment Protection: still open, not this agent's blocker to clear

Confirmed decision: Deployment Protection stays ON. `VERCEL_AUTOMATION_BYPASS_SECRET` was
reported set "in your environment and GitHub Actions secrets" - checked both and it's in
neither:

- This machine's User/Machine/Process environment scopes all report it unset
  (`[Environment]::GetEnvironmentVariable(...)` in PowerShell, and `cmd /c echo
  %VERCEL_AUTOMATION_BYPASS_SECRET%` prints nothing).
- `gh secret list` on the repo shows only `CI_SUPABASE_SERVICE_ROLE_KEY` - the Vercel bypass
  secret isn't there either.

Per this task's own "never echo it, never write it to any file or log" instruction alongside
this absence, the only honest move is to report it, not guess a value or skip the check quietly.
**Deploy verification (build success, `proxy.ts` behavior on the deployed edge network,
env-leakage check on the delivered bundle) and the human's §9 browser smoke test are both still
blocked on this** - documented in `docs/deployment.md` §6 with the exact bypass-header mechanism
(`x-vercel-protection-bypass`) ready to use the moment the secret is actually reachable, plus a
CI snippet in §8 referencing it by name for any future deploy-check job. Nothing was worked
around; nothing was assumed to have passed.

### Deviations

- **`supabase/config.toml`'s `[storage]` disabled** - same category of change as Day 2's
  `studio`/`edge_runtime` disables (flaky CloudFront pulls, zero application consumers), not a
  scope change; reversible.
- **The `vector` container fix was operational (`docker stop`), not a config/code change** -
  logged here as a debugging note for future sessions, not something committed, since the
  crash-loop is a Docker Desktop networking symptom on this machine, not a project setting.
- **Grants-hardening migration numbered `20260713030000`**, later than the same day's Day 9
  migrations - correct ordering, just flagging that "Day 10" and "Day 9" migrations both carry
  a `20260713` date prefix since both landed the same calendar day in this project's timeline.

### Verification

- Full quality loop green: `npm run typecheck && npm run lint && npm run validate:content && npm
  run test:coverage && npm run build`. 260 unit tests unchanged, 100% coverage maintained.
- `scripts/smoke-test-rls.mjs`: **31/31 passed, both local and staging** (confirmed by directly
  re-running, not inferred from the migration alone).
- `information_schema.role_table_grants` against staging, post-migration: `anon` has zero grants
  on any `public` table (checked directly); `authenticated`/`service_role` have exactly their
  intended explicit grants (checked directly).
- `admin.auth.admin.listUsers()` against staging: still exactly one user (`demo@taxops.local`) -
  the extended smoke test's own throwaway user is still cleaned up correctly after the changes.
- `npx supabase migration list --linked`: all four migrations match between local and staging,
  no drift.
- **Not verified, still blocked**: Vercel build success, `proxy.ts` on the deployed edge network,
  env-leakage check on the deployed bundle, §9's human smoke test - all four need
  `VERCEL_AUTOMATION_BYPASS_SECRET` to actually be reachable first.

## Day 10 continuation 3 — Deploy Verification: a Real Outage Found (2026-07-13)

### Bypass secret: reachable, but not from every tool in this session

Re-checked both places per instruction: `gh secret list` now shows
`VERCEL_AUTOMATION_BYPASS_SECRET` (GitHub Actions side, confirmed). This session's Bash shell
still reported it unset - but PowerShell's `[Environment]::GetEnvironmentVariable(...,'User')`
(a direct registry read, not process-inherited state) confirmed it **was** set. Root cause: a
long-running shell process only has the environment it inherited at its own startup; a User-scope
env var set afterward doesn't retroactively appear in an already-running process, only in new
ones. This session's PowerShell tool calls happen to start a fresh process each time (so they
saw it immediately); the Bash ones do not. Used PowerShell for the rest of this session's checks
accordingly - worked around by picking the tool that could see it, not by declaring it
unreachable a second time.

### Verification result: the deployed staging app is currently down - a real, previously-unknown
outage, not a false alarm

With the bypass header attached (`x-vercel-protection-bypass`, past Vercel's SSO gate cleanly),
every route tried returns **`500 Internal Server Error`**: `/`, `/tips`, `/sign-in`, `/sign-up`,
`/dashboard`, `/auth/confirm` - reproduced 3 consecutive times, not transient. In the same
deployment, `/favicon.ico` (a static asset, excluded from `proxy.ts`'s matcher) returns a clean
`200` with correct headers and content. That contrast is the diagnosis: the build itself
succeeded (static assets are being served correctly), but **every single non-static request
fails identically**, including a fully static page (`/sign-in`) that has no page-level logic of
its own to fail. The one thing that runs on literally every one of those requests and nothing
else: `proxy.ts`, whose matcher excludes only static assets/images. Traced the code
(`src/lib/supabase/middleware.ts`): `updateSession()` calls `requireEnv("NEXT_PUBLIC_SUPABASE_URL")`
and `requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")`, each of which throws a hard `Error` if its
variable is missing - exactly the failure mode that would produce this symmetric pattern.
`NEXT_PUBLIC_SITE_URL` is not read by `proxy.ts` at all, so this points specifically at one or
both Supabase env vars not actually reaching the deployed Edge Middleware runtime, despite being
set in the Vercel dashboard per the continuation-1 message.

**Not fixed by this agent** - no Vercel dashboard/API access exists in this environment, same
human-owned boundary as project/env-var creation in §1/§6. `docs/deployment.md` §6 lists the
specific things worth checking (environment scope Production-vs-Preview, Runtime-vs-Build-time
scoping, exact variable name spelling, and whether a fresh deployment is needed after any
correction since Vercel env var changes don't always retroactively apply to an already-built
deployment).

**Everything else this task asked to verify - `proxy.ts` redirect behavior, public page
content, env-leakage in delivered HTML - is blocked behind this 500.** There's no successful
response yet for any of those checks to inspect. Re-running the same curl commands once the env
var issue is corrected will complete them in one pass - nothing else about the verification
approach needs to change.

### CI: deploy checks confirmed manual for v1, by decision

Left `.github/workflows/ci.yml` untouched - no job wired to hit the deployed URL. Two reasons,
written up in `docs/deployment.md` §8: (1) the `e2e` job's whole design tests a disposable local
Supabase instance, a different concern from "is today's Vercel deployment healthy"; (2) the
deployment is *currently* broken, so an automated check against it right now would turn CI red
for an infrastructure reason unrelated to any code change - the wrong kind of signal for a gate
to give. The bypass-header mechanism is documented and ready to wire in as a real job once the
deployment itself is healthy again, so a first automated check starts green.

### Deviations

- **Used PowerShell instead of Bash for the deploy-verification curl checks** - the only tool in
  this session that could see the freshly-set bypass secret without a shell restart (see above).
- **No fix attempted for the 500** - purely a "stop and report" finding per this task's own
  boundary; guessing at or attempting to change Vercel env var configuration without dashboard
  access wasn't an option, and wouldn't have been appropriate even if it were, given the
  human-owned-secrets boundary this whole deployment task has followed throughout.

### Verification

- Bypass secret reachability: confirmed present in GitHub Actions (`gh secret list`) and (via
  PowerShell) this machine's registry - both checked directly, not assumed.
- Deployed URL, 6 routes, 3 repeated checks: consistent `500` on every one, `200` on the one
  static-asset control (`/favicon.ico`) - a real, reproduced-not-inferred finding.
- Root-cause diagnosis is traced to specific source lines (`src/lib/supabase/middleware.ts`'s
  two `requireEnv` calls), not a guess from the HTTP status alone.
- **Not verified, still blocked on the human fixing the Vercel env var issue**: `proxy.ts`
  redirect behavior on a working deployment, public page content, env-leakage in delivered HTML,
  §9's human smoke test.

## Day 10 continuation 4 — Verification after reported env fix: outage still reproduces (2026-07-14)

### Re-ran the exact §6/§8 checks the task asked for - result contradicts the "fixed and redeployed" report

Bypass secret still reachable (same PowerShell-vs-Bash process-inheritance quirk as continuation
3 - used PowerShell again). Hit both known URLs with the bypass header:
`taxops-zq0cyhorm-vishwas2018s-projects.vercel.app` (the specific deployment hash from
continuation 3) and `taxops-vishwas2018s-projects.vercel.app` (the hashless project alias, which
should track whatever the latest deployment is). **Both still return `500` on every non-static
route** - `/`, `/tips`, `/sign-in`, `/sign-up`, `/dashboard`, `/auth/confirm` - reproduced 3
consecutive times on `/sign-in` with three distinct `X-Vercel-Id` values (`syd1::xl464-...`,
`syd1::b778j-...` twice), confirming these are fresh function invocations, not a stale cached
response. `/favicon.ico` still serves a clean `200 image/vnd.microsoft.icon`. This is the
identical signature documented in continuation 3, unchanged.

**Conclusion: the env var fix + redeploy this task described as done has not resolved the
deployed outage**, at least not at either URL reachable from this environment. Did not guess at
why - no Vercel dashboard/API access exists here to check which environment scope was actually
edited or whether a build actually completed after the edit (same human-owned boundary as every
other Vercel-dashboard-only step in this doc). Three concrete possibilities written up in
`docs/deployment.md` §6 for the human to check directly: the corrected var may be scoped to the
wrong environment (Production vs Preview) relative to the URL being tested, the redeploy may have
been triggered before the env var correction landed rather than after, or the hashless alias may
still be pointing at an older, pre-fix deployment.

**Everything downstream of the 500 is still blocked**, exactly as in continuation 3: env-leakage
check on delivered HTML/bundles (nothing has ever loaded to inspect), `proxy.ts` redirect
behavior on a working deployment, and §9's human smoke test. Not handing back for §9 - that
would imply the deploy is healthy, which this re-check disproves.

### Docs updated regardless - the debugging lesson holds independent of this attempt's outcome

Added to `docs/deployment.md`:
- **§6**: this re-verification's result, plus the general lesson: "every route 500s identically
  except static assets" is the fingerprint of middleware/proxy-layer code failing on every
  request, not a generic crash - check `proxy.ts`'s `process.env` reads first, confirm the
  variables are scoped to *both* the right environment *and* Runtime (not just Build-time), and
  confirm a fresh deployment happened *after* any env var correction (Vercel doesn't retroactively
  re-inject corrected vars into an already-built deployment).
- **§4**: a short cross-reference tying `smoke-test-rls.mjs`'s shell-exported env vars to the
  same underlying bug class ("set somewhere" vs "set where the running process can read it") -
  the RLS-verification section already demonstrates the same shell/process-env distinction that
  caused continuation 3's Bash-vs-PowerShell quirk, so it's a natural, non-forced place for the
  reminder rather than duplicating unrelated Vercel detail there.

### Deviations

- **None** - no code touched, no attempt to work around the still-missing dashboard/API access.
  This entry is a "stop and report" finding, same boundary as continuations 2 and 3.

### Verification

- Bypass secret reachability: reconfirmed via PowerShell (same registry-read method as
  continuation 3).
- 6 routes checked against 2 known URLs, `/sign-in` re-checked 3x with distinct `X-Vercel-Id`
  values to rule out cache/transience - all consistent, reproduced directly, not inferred.
- **Still not verified, still blocked**: env-leakage check on delivered HTML/bundles, `proxy.ts`
  redirect behavior on a working deployment, §9's human smoke test - all four need the deployed
  app to actually serve a non-500 response first, which it does not yet.
- CI: no code changed this entry (docs + `PROGRESS.md` only), so no new CI run needed to verify
  against; last run on `main` (`docs: Day 10 deploy verification - found a real staging outage`,
  2026-07-13) is green per `gh run list`.

## Day 10 continuation 5 — Final verification: root cause was zero env vars, now fixed (2026-07-14)

### Root cause, confirmed via dashboard (not inferred this time)

The 2026-07-13 "fix" never actually landed - **the project had zero environment variables set**,
confirmed directly in the Vercel dashboard, not a Production-vs-Preview scoping mismatch as
hypothesized in continuation 4. The runtime function log made this unambiguous: `Missing
required environment variable: NEXT_PUBLIC_SUPABASE_URL`, thrown from `requireEnv` inside
`updateSession()` - the exact function and exact variable named in the 2026-07-13 source-level
diagnosis (`src/lib/supabase/middleware.ts`), just confirmed by the platform's own log instead of
inferred from the HTTP status pattern alone. Both `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are now added (all environments), followed by a fresh no-cache
redeploy.

### Re-ran the full §6/§8 verification - everything passes

- `/` → `200`, title `TaxOps`, real HTML (20,116 bytes).
- `/tips` → `200`, title `Tax Tips — TaxOps`, `<h1>Tax Tips</h1>`.
- `/sign-in` → `200`, title `Sign in — TaxOps`.
- `/sign-up` → `200`, title `Create account — TaxOps`.
- `/dashboard` (unauthenticated) → `307` to `/sign-in?redirectTo=%2Fdashboard` via `proxy.ts` -
  matches the Day 2/Day 9 locally-verified behavior exactly.
- `/auth/confirm` (no token) → `307` to `/sign-in?error=auth-confirm-failed`, not an error -
  responds correctly at the status level, as this check only ever required.
- **Env-leakage check**: fetched the root and `/sign-in` HTML plus all ten `/_next/static` JS
  chunks referenced from the root page; searched for `SERVICE_ROLE`, any secret-shaped
  uppercase env name, any `*.supabase.co` URL, and any JWT-shaped (`eyJ...`) token. Found none
  of the above - not even the expected `NEXT_PUBLIC_SUPABASE_URL`/anon key. Traced why:
  `src/lib/supabase/client.ts` (the browser Supabase client factory) has **zero importers**
  anywhere under `src/` right now - every existing auth flow (sign-in, sign-up, confirm) runs
  through the server-only `server.ts` client and `proxy.ts`, never the browser client. Nothing
  ships because nothing client-side reads those vars yet; this is expected given the current
  code, not a gap. Flagged in `docs/deployment.md` §6 as worth re-checking the day a client
  component first imports `client.ts` - the anon key appearing in a bundle at that point is
  correct and by design (§6's env var table already covers why it's meant to be public), just
  worth confirming it's *only* the anon key/URL and nothing else at that time.

### `docs/deployment.md` updated - incident closed in §6

Added the confirmed root cause (zero vars, not a scoping mismatch), the full re-verification
result, and a concrete process addition: **check that the environment variables list is
non-empty before triggering a redeploy meant to fix an env issue** - this exact incident's root
cause would have been caught in seconds by that one look, before reaching for the deeper
Production-vs-Preview/Runtime-vs-Build-time diagnosis (still correct, still kept in the doc, just
now framed as the second thing to check, not the first).

### Deviations

- **None.**

### Verification

- All 6 routes checked directly against the live deployment with the bypass header, statuses and
  redirect targets read from actual response headers, not assumed.
- Env-leakage check performed against actual fetched bundle content (681,874 chars across 10
  chunks plus 2 HTML documents), not a static-analysis guess.
- Full quality loop unaffected (docs-only change) - last code-touching commit's CI run remains
  green; this entry's own commit re-confirmed green via `gh run watch` before hand-back.

**Handing back for §7/§9**: the human's manual browser smoke test (signup → email confirm →
profile wizard → calculator → checklist) is the one remaining unverified step. Migration
discipline (§7) has no outstanding action - already in effect since the Day 10 grants migration.

## Day 11 — Content + Compliance Pass (2026-07-14)

### Carry-over from Day 10 §9 smoke test: none supplied, flagged rather than assumed

This task's own template for "Carry-over from smoke test" arrived unfilled (the literal
placeholder text, not a real list or the word "none"). Rather than silently treat that as "no
issues," it's flagged here explicitly - **please confirm whether the §9 smoke test surfaced
anything** before treating this day's work as the full remaining scope. Nothing in this entry
below addresses a smoke-test finding, since none was actually provided.

### Content expansion: 3 seed articles → 9 total, 6 new

Added, all `financialYear: "2025-26"`, `reviewDate: "2026-07-14"`:

- **contractor-expenses** (now 3): `home-office-running-costs-for-contractors.mdx` (fixed-rate
  vs actual-cost methods), `tools-and-equipment-depreciation-for-contractors.mdx` (immediate
  deduction vs decline in value, low-value pooling, balancing adjustments on disposal).
- **property-deductions** (now 3): `interest-deductibility-for-investment-loans.mdx` (purpose-
  of-borrowing test, redraw vs offset, mixed-purpose apportionment), `depreciation-schedules-
  and-quantity-surveyors.mdx` (Division 40 vs 43, the second-hand plant/equipment restriction,
  why a QS report is the practical mechanism).
- **superannuation** (now 2): `division-293-tax-explained.mdx` (the combined-income test, the
  effective ~30% rate, independence from the concessional cap).
- **wealth-preservation** (now 1, new category): `record-keeping-and-cgt-evidence.mdx` (why CGT
  records outlive the general 5-year rule, what builds a cost base, why depreciation claimed
  reduces it at disposal).

All 400-700 words (477-508 actual), pass `npm run validate:content`, follow the seed articles'
existing structure (general mechanism → nuance → record-keeping → explicit "what this doesn't
cover" boundary), and use "claim"/"deductible" as ordinary descriptive vocabulary throughout -
same as the approved seed content - never as a second-person instruction.

**Shipped `draft: true`, not `draft: false` like the Day 6 seed articles.** The constitution's
default (CLAUDE.md §"v1 Scope", Human Gate 2) is `draft: true` until content review; the seed
articles' `draft: false` was an explicit, one-off, documented Day 6 deviation ("pipeline-proving
placeholders"), not a precedent this day extends. Gate 2 is still open (see Human gates below),
so these 6 stay unpublished (excluded from `/tips` and `generateStaticParams` - confirmed in
the build output, which lists only the original 3 slugs) until reviewed and flipped.

**Source URLs could not be click-verified by this agent.** Every direct `WebFetch` attempt
against `ato.gov.au` returned `HTTP 403` in this session - including against a URL already
cited as a working source in `fy2025-26.ts`'s own config, so this is bot-blocking of the fetch
tool itself, not a sign of a bad URL. The 12 source URLs above follow the exact path structure
of the two ATO pages already cited in the seed articles and `tax-config` (same domain
conventions: `/individuals-and-families/...`, `/rates/...`), chosen for structural accuracy, not
independently browser-confirmed. **These need the human's own click-through before Gate 2**,
the same "stop and report, don't guess" boundary as every dashboard/API-gated step in this
project - and this exact limitation is now documented as the reason `docs/updating-tax-data.md`
frames ATO verification as a mandatory human/browser step, not an agent one.

### Compliance audit: swept, no violations found in existing UI copy

Manually reviewed every named surface: both calculator results components, the tax-profile
wizard and its question copy, the checklists page/templates/client (including empty and
hidden-group states), the dashboard, the marketing home/tips pages, and the auth pages. A
`grep -i` sweep of `src` for `you should|we recommend|guarantee[ds]?|will save you|must claim`
found only false positives (`Superannuation guarantee` the SG payment line item, `guaranteed`
inside dev comments) - **no actual violations to fix**. Documented here per the task's own "list
them in PROGRESS.md" instruction, even though the list is empty: the audit happened and found
the existing copy already compliant, this isn't a skipped step.

### Extended the no-advisory-phrasing lint, beyond just checklists

New `src/lib/compliance/copy-audit.test.ts`, alongside (not replacing) the original
`templates.test.ts` checklist-only lint. Covers two additional UI copy sources (`CALCULATORS`
cards, `TAX_PROFILE_QUESTION_GROUPS` incl. every option label) plus every article MDX body
found under `content/`.

**Deliberately two different banned-word lists, not one reused list** - documented in the test
file itself: UI copy still bans "claim" outright (it reads as a direct instruction to the
reader there), but article prose cannot ban "claim" the same way - every seed and new article
uses it as ordinary tax-law vocabulary ("a deduction claim", "claimed in full"), so a bare ban
would fail all nine articles including the already-approved seed three. Article prose is
instead checked for actual advisory/certainty patterns ("you should", "we recommend", "you
must") plus outcome-guarantee phrases (`"guaranteed to"`, `"we guarantee"` - not bare
"guarantee", which collided with the real term "Superannuation Guarantee" the first time this
test ran, caught immediately by `concessional-contributions-cap-explained.mdx` failing on its
own legitimate use of that name).

Freeform page-level JSX text that isn't a named constant (marketing hero copy, dashboard
headings) isn't reachable by this data-driven approach - covered by the manual sweep above
instead, same tradeoff the original checklist-only test already had.

### `docs/updating-tax-data.md` added

Annual FY-update procedure: duplicate-the-config-file pattern (and the fact that there's no
single cutover seam yet - `fy2025_26` is imported by name at roughly a dozen call sites, grep
for it rather than assuming a registry exists), the click-verification requirement now backed
by this day's own repeated 403 finding, the Day 3.5 FY-mislabeling near-miss (a secondary
source titled "...for 2026" actually describing FY2026-27 HELP thresholds, not FY2025-26) as
the documented warning, golden-file regeneration procedure (Day 3.5's Medicare-threshold change
as the worked example - exactly one test affected, both expected values hand-recomputed), the
`reviewDate` refresh-on-figure-change step, and the two mandatory re-review triggers: 1 July
(routine) and May Budget night - citing the FY2025-26 Medicare low-income thresholds' own 2.9%
retroactive uplift (Budget Paper No. 2, 12 May 2026, applied back to 1 July 2025) as precedent
that a Budget can change a current, already-Gate-1-reviewed year's figures, not just next
year's.

### Marketing page: no literal placeholder text found; expanded thin copy into real positioning

The existing homepage had no "Lorem ipsum"/TODO-style placeholder - it was already compliant
("Educational only — not lodgement, not personal advice") but thin (one hero paragraph, no
description of what the product actually contains). Added an exported `FEATURES` array (now
covered by the compliance sweep above) with one card per v1-visible module - guided tax
profile, estimate calculators, EOFY checklists, tax tips knowledge base - each described by what
it does and its educational framing, no outcome language. New `page.test.tsx` (none existed
before) asserts the four module names render and the no-outcome-promised line is present.

### Deviations

- **New articles shipped `draft: true`**, not matching the Day 6 seed articles' `draft: false` -
  see "Content expansion" above; this is a return to the constitution's stated default, not a
  deviation from it, but flagged since it means these 6 won't be visible in a browser until
  Gate 2 review flips them.
- **Source URLs not click-verified** - see above; structurally-accurate but not browser-
  confirmed, needs human follow-up before Gate 2, same as every ATO-URL caveat already on
  record for this project's existing config and seed articles.
- **Two banned-word lists instead of reusing one** for the extended lint test - see "Extended
  the no-advisory-phrasing lint" above for why a single reused list breaks on legitimate
  content.
- **Carry-over smoke-test issues not addressed** - none were actually supplied this round (see
  top of this entry).

### Verification

- Full quality loop green: `npm run typecheck && npm run lint && npm run validate:content &&
  npm run test:coverage && npm run build`. 266 tests (up from 260), 100% coverage on
  `src/lib/calculators/` maintained.
- `npm run validate:content`: 9/9 articles pass (schema, slug/folder match, no disclaimer
  duplication).
- Build output's `/tips/[slug]` static params list exactly the original 3 slugs - confirms the
  6 new `draft: true` articles are correctly excluded from the live site, not just excluded in
  theory.
- New `copy-audit.test.ts` (3 tests) and `page.test.tsx` (3 tests) both pass; ran the article-
  body check once with the original banned-word list to confirm it correctly failed on
  "Superannuation Guarantee" before narrowing the list - a real true-positive-turned-false-
  positive caught by actually running the test, not assumed to work from reading it.

## Day 11.9 — Audit screenshot set + self-audit (2026-07-14)

### Regenerated the full screenshot suite, added the missing captures

Ran `npm run test:e2e` in full (38 tests, all pass) - this naturally regenerated the existing
numbered `e2e/screenshots/*.png` set against the current post-Day-11 build (visible in `git
status`: 8 of the 11 changed, including `01-marketing-home.png` reflecting the new feature-grid
homepage) as well as running the new spec below. New `e2e/visual/audit-screenshots.spec.ts`
outputs a separate, broader batch to `e2e/screenshots/audit/` (16 PNGs) for external design
review - full desktop set (marketing home, both auth surfaces, dashboard, tips index + article,
all three calculators, checklists) plus the three captures this task asked to add if missing:
a wizard step with an option actually selected (`wizard-step-1-with-selection.png` - the
existing suite only had the empty/no-answer state), a checklists page with an item toggled and
one custom item present (`checklists-with-toggle-and-custom-item.png`), and 390px mobile
variants of the dashboard, the contractor take-home calculator, and the wizard
(`mobile-*.png`). The "calculator in filled/results state" ask was **already covered** - all
three calculator screenshots in the existing suite already filled the form and clicked
Calculate before capturing - so no fourth new capture was needed there, just carried forward.

**Draft-article exclusion verified two ways, not just eyeballed**: the tips-index test asserts
`expect(page.getByText(title)).toHaveCount(0)` for all 6 Day 11 `draft: true` article titles
*before* taking the screenshot, and the build output's `/tips/[slug]` static params (checked
again this run) list only the original 3 published slugs. Both agree with what the screenshot
itself shows.

Absolute paths for all 16 audit PNGs (for upload to external review):

```
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\auth-sign-in.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\auth-sign-up.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\calculator-contractor-take-home-filled.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\calculator-div-293-filled.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\calculator-property-cash-flow-filled.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\checklists-default.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\checklists-with-toggle-and-custom-item.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\dashboard.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\marketing-home.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\mobile-calculator-contractor-take-home.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\mobile-dashboard.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\mobile-wizard-step-1.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\tips-article.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\tips-index.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\wizard-step-1-empty.png
C:\Users\vishw\Vish\Vish\KeepMore\taxops\e2e\screenshots\audit\wizard-step-1-with-selection.png
```

### Self-review written to `docs/audit-self-review.md` - findings only, no fixes

Reviewed every one of the 16 screenshots against `docs/design.md` (elevation ladder, spacing,
type hierarchy, `tabular-nums`, disclaimer prominence, empty states), screen by screen,
severity-tagged. Highlights (full detail and every screen in the doc itself):

- **[CRITICAL]** The app sidebar nav (`hidden ... md:block`) has **no mobile alternative
  anywhere in the codebase** - confirmed by grep, not just by looking at one screenshot. Below
  768px a signed-in user cannot navigate between app sections at all once they leave the
  dashboard, except in-page links, browser back, or a typed URL. The single most severe finding
  in this pass.
- **[HIGH]** `tips-article.png` renders the footer disclaimer **twice**, back-to-back - the
  nested `tips/[slug]/layout.tsx` and the parent `(marketing)/layout.tsx` each render their own
  copy for that specific route. A genuine bug, not a polish nit; `/tips` (the index) confirms it
  by *not* showing the duplication, since it lacks the extra nested layout.
- **[HIGH]** Every text input renders `rounded-lg` (16px) instead of the doc's `sm` (6px) for
  inputs, making every form field in the app fully pill-shaped at its `h-8` height. Isolated to
  `src/components/ui/input.tsx` - one component, fixes every screen at once.
- **[MEDIUM]** Elevation ladder isn't used consistently - no surface in the app currently uses
  `variant="elevated"`, and the wizard plus every calculator's input form have **no** card/
  surface wrapper at all, while the calculator results panel and dashboard summary cards do
  (plain `border`, still no shadow). Clearest on the calculator screens, where the results panel
  and the input form sit side by side with different treatment on the same screen.
- **[LOW]** Percent figures (dashboard progress, checklist overall progress) don't carry
  `tabular-nums` - verified by grep, not assumed; all three calculators' currency figures
  correctly do.
- Noted without investigating: a Next.js Dev Tools "1 Issue" indicator appeared during the
  checklists toggle-and-custom-item capture - flagged in the review doc so it isn't lost, out of
  scope for a design-alignment pass.

### Deviations

- **None** - no fixes applied to anything found above, matching this task's explicit "no fixes
  applied yet" scope. Running the full suite (not just the new spec) also refreshed 8 of the 11
  pre-existing numbered screenshots as a side effect of a real `npm run test:e2e` run - committed
  alongside, since they now accurately reflect the current build rather than becoming stale.

### Verification

- Full quality loop green: `npm run typecheck && npm run lint && npm run validate:content &&
  npm run test:coverage && npm run build`. 266 tests, 100% coverage maintained (this day added
  an e2e spec, not a unit test - coverage numbers are unchanged from Day 11).
- `npm run test:e2e`: full suite, 38/38 pass (25 pre-existing + 13 new in
  `audit-screenshots.spec.ts`), confirming the new spec doesn't interfere with specs sharing the
  same E2E user (Playwright's default file ordering runs `visual/` after `accessibility/` and
  `journeys/`, so the audit spec's profile-reset/checklist-mutation calls land after other
  specs' own assertions, not before).

## Day 12 Part A — Fixing the Day 11.9 self-audit findings (2026-07-15)

Fixed every CRITICAL/HIGH/MEDIUM finding from `docs/audit-self-review.md`, plus the LOW items
that were cheap. Scope was explicitly "fix objective defects against `docs/design.md`," not new
design work - no new dependencies, stayed inside the doc's existing vocabulary (radii table,
`Card` variants, `tabular-nums` rule).

### [CRITICAL] Mobile navigation

Below `md`, `(app)/layout.tsx`'s sidebar was `hidden ... md:block` with nothing standing in for
it - confirmed by the audit's grep, no hamburger/Sheet/Drawer existed anywhere. Built
`src/components/nav/mobile-nav.tsx`: a top-bar hamburger button (visible `md:hidden`, next to a
`TaxOps` wordmark in the same row as `UserMenu`) opening a left slide-over listing the same five
destinations as `AppSidebar` - both now read from a shared `src/components/nav/nav-items.ts` so
they can't drift apart.

**Judgment call - top bar + sheet over a bottom tab bar**: chose the sheet because it reuses
`ui/dialog.tsx`'s existing `@base-ui/react` Dialog primitive (modal by default: focus trap, body
scroll lock, and Escape-to-close are the primitive's job, not hand-rolled) and because it can
literally reuse the same nav-items list as the desktop sidebar with zero layout redesign. A
bottom tab bar would need five evenly-sized icon+label slots designed from scratch and doesn't
map onto an existing component - more new surface for a fix-scoped task.

**A real bug found and fixed along the way**: the first implementation wrapped each nav `Link`
in `DialogClose` (mirroring the existing X-button-close pattern in `ui/dialog.tsx`). That
unmounts the Popup - and the Link inside it - in the same tick as the click, racing Next's
client-side navigation and silently dropping it before the route changed (e2e caught this: URL
stayed on `/dashboard` after clicking "Checklists"). Fixed by controlling `open` state locally
and closing it via a render-time reset keyed on `pathname`
(https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes -
not a `useEffect`, which `eslint-plugin-react-hooks` correctly flags as cascading-render-prone
for this exact pattern) - the sheet now closes because the route changed, not because closing it
was what triggered the route change.

**Accessible name correction**: the sheet's `DialogTitle` originally read "TaxOps" (matching the
sidebar's own wordmark), but Base UI wires the dialog's `aria-labelledby` to whatever renders as
`DialogTitle` - this wins over any `aria-label` set on the popup itself, and "TaxOps" as a
dialog name reads as a second, ambiguous brand link to screen reader users. Changed the visible
title to "Menu".

Covered by `e2e/journeys/mobile-nav.spec.ts` (390px): open → navigate to Checklists → assert
arrival at `/checklists` with the sheet closed; all five destinations are listed; focus is
trapped for 10 Tab presses, body scroll is locked while open, and Escape closes it and returns
focus to the trigger. The focus-trap assertion uses `expect.poll` rather than a bare
`page.evaluate` check - Base UI's focus-guard redirect at the trap boundary lands a tick after
the native Tab keypress, and a synchronous check raced it intermittently (2/3 flaky before the
fix, 0/8 after across repeated local runs).

### [HIGH] Double disclaimer on `/tips/[slug]`

`tips/[slug]/layout.tsx` rendered its own `<Disclaimer variant="footer" />` "so an MDX file can't
omit it" - but `(marketing)/layout.tsx` already renders one unconditionally for every route in
that group, this one included, so the guarantee already existed one level up. Removed the
nested layout's copy; the no-omit guarantee is unaffected (the parent layout can't be bypassed
by any route under it). Swept every other `layout.tsx` in the app (`(app)`, `(auth)`, root,
`(marketing)`) - `/tips/[slug]` was the only route nested under two layouts, so no other instance
of this duplication class exists.

Added a regression test (`page.test.tsx`) that composes `MarketingLayout` around
`TipArticleLayout` the way Next.js actually nests them for this route, and asserts
`getAllByText(STANDARD_DISCLAIMER)).toHaveLength(1)`. Also split `layout.test.tsx`'s old
"renders the standard disclaimer" test (which was asserting the bug as if it were the intended
contract) into one test confirming the layout renders its children unmodified, and one
confirming it does *NOT* render its own disclaimer. Found the same stale assumption baked into
`e2e/journeys/tips-article.spec.ts`, which asserted the disclaimer specifically **inside
`<main>`** with a comment claiming "both legitimately render on this page" - updated to assert
exactly one disclaimer, outside `<main>`.

### [HIGH] Input radius

`src/components/ui/input.tsx` used `rounded-lg` (16px) against the doc's `sm` (6px) for inputs -
at the input's `h-8` height that's a full pill. Single-line fix (`rounded-lg` → `rounded-sm`)
corrects every input in the app at once, confirmed no per-page `className` override on any
`<Input>` usage could reintroduce a pill (grepped all ~20 call sites - none pass a `className`).
Also fixed the same wrong radius on the property-cash-flow calculator's hand-rolled native
`<select>` (not the shared `Input` component, but visually indistinguishable from one, and it
carried the identical bug). Left `select.tsx` and `textarea.tsx`'s vendored shadcn primitives
with the same latent `rounded-lg` - neither has a live consumer anywhere in the app yet, so
fixing them is out of this fix-scoped task; flagging here so it isn't lost before either is
ever wired up.

### [MEDIUM] Elevation consistency

**Judgment call**: leaned into "apply `variant="elevated"`" rather than "flat is the intentional
look," per the audit's own framing that this is a judgment call either way is valid. Applied:

- Calculator forms (`contractor-take-home`, `div-293`, `property-cash-flow`): the input side
  now sits in a base `<Card>` (matching the results panel's existing surface, not elevated
  itself - the two panels read as one system instead of "styled panel next to raw fields").
- Calculator results panels: `variant="elevated"` added (was base `Card` in all three).
- Wizard question/review content (`tax-profile-wizard.tsx`): now wrapped in a base `<Card>`,
  matching the calculator forms' treatment for the same kind of content (a question surface in
  the same app shell).
- Dashboard: the "Tax profile" and "EOFY checklist" summary cards get `variant="elevated"`; the
  three calculator link-cards (already `variant="interactive"` for the hover lift) additionally
  get `shadow-raised` via `className` rather than switching `variant`, since `interactive`'s
  hover-lift behavior needed to stay and the two aren't mutually exclusive at the class level.

Left the calculator pages' "no result yet" placeholder text unwrapped (not matching the
results-Card shape until a result exists) - out of the audit's specific complaint (which was
about the form vs. results asymmetry, not the pre-submit empty state), flagging rather than
expanding scope silently.

### [LOW] `tabular-nums` and the dev-tools indicator

Added `tabular-nums` to the three percent figures the audit found missing it: both dashboard
progress cards (`completeness.percent`, `checklistProgress.percent`) and the checklists overall-
progress line. The checklists one required wrapping just the digits in their own `<span>` (the
sentence around it also contains a literal `%` and "complete)" text) - broke the existing unit
test's plain-string/regex `getByText` match (RTL's default text matcher requires the full string
in one uninterrupted text node, not concatenated across child elements), fixed by matching on
the paragraph's assembled `textContent` via a function matcher instead.

**"1 Issue" dev-tools indicator - classified and fixed, not just logged**: reproduced it by
running `next dev` directly and reading the terminal, not just the browser. It was Turbopack's
workspace-root inference warning - the parent `KeepMore/` directory (outside this repo) has an
unrelated, empty, accidental `package-lock.json`, so Turbopack detected two lockfiles and
guessed a root spanning both. Fixed with `turbopack.root` in `next.config.ts`, scoped to this
project's own directory, per Next's own documented remedy for exactly this warning. Confirmed
by restarting `next dev` and diffing the startup log (warning gone), and the regenerated
`checklists-with-toggle-and-custom-item.png` screenshot now shows the dev-tools badge with no
"1" overlay. Did not touch the stray outer lockfile itself - it's outside this git repository
entirely, not this task's to clean up.

### Deviations

- Did not fix `select.tsx`/`textarea.tsx`'s matching `rounded-lg` bug (see Input radius above) -
  no live consumer, out of a fix-scoped task's boundary.
- Did not add a surface wrapper to the calculator pages' pre-submit placeholder text - see
  Elevation consistency above.

### Verification

- Full quality loop green: `npm run typecheck && npm run lint && npm run validate:content &&
  npm test && npm run build`. 268 unit tests passing (2 new: the composed single-disclaimer
  regression test and the layout's "does NOT render its own disclaimer" test).
- `npm run test:e2e`: full suite green, 41/41 (38 pre-existing + 3 new in
  `mobile-nav.spec.ts`), including the axe accessibility scans and the fixed
  `tips-article.spec.ts` assertion.
- Regenerated all 16 `e2e/screenshots/audit/*.png` via `audit-screenshots.spec.ts` - the three
  mobile captures changed the most (now show the top bar/hamburger instead of bare content), the
  three calculator and wizard captures show non-pill inputs and card-wrapped forms, and
  `tips-article.png` now shows exactly one disclaimer.

## Human gates (for reference)

- ⛔ **Gate 1** (end of Day 3): FY2025-26 rate tables + ATO source URLs presented for sign-off
  before calculator UIs are built on top.
- ⛔ **Gate 2** (end of Day 8): all article content + calculator outputs reviewed against ATO
  guidance; articles stay `draft: true` until approved. **Note (Day 6)**: the 3 seed articles
  currently ship `draft: false` as pipeline-proving placeholders per explicit Day 6 instruction
  - they still need this review before being treated as approved public content. **Note (Day
  11)**: 6 further articles added, correctly `draft: true` pending this same review - their
  source URLs are structurally-accurate but not browser-click-verified (see Day 11 entry), so
  that verification is part of what this gate needs to cover for them specifically.
- ⛔ **Gate 3** (end of Day 10): production Supabase project + Vercel env vars + deploy
  approval.
