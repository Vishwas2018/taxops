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

### Next up — Day 3

FY2025-26 tax config + income tax / Medicare / Div 293 / super engines with exhaustive
boundary tests, then **⛔ Human Gate 1**.

## Human gates (for reference)

- ⛔ **Gate 1** (end of Day 3): FY2025-26 rate tables + ATO source URLs presented for sign-off
  before calculator UIs are built on top.
- ⛔ **Gate 2** (end of Day 8): all article content + calculator outputs reviewed against ATO
  guidance; articles stay `draft: true` until approved.
- ⛔ **Gate 3** (end of Day 10): production Supabase project + Vercel env vars + deploy
  approval.
