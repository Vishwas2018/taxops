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

## Human gates (for reference)

- ⛔ **Gate 1** (end of Day 3): FY2025-26 rate tables + ATO source URLs presented for sign-off
  before calculator UIs are built on top.
- ⛔ **Gate 2** (end of Day 8): all article content + calculator outputs reviewed against ATO
  guidance; articles stay `draft: true` until approved. **Note (Day 6)**: the 3 seed articles
  currently ship `draft: false` as pipeline-proving placeholders per explicit Day 6 instruction
  - they still need this review before being treated as approved public content.
- ⛔ **Gate 3** (end of Day 10): production Supabase project + Vercel env vars + deploy
  approval.
