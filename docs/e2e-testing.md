# E2E testing (Playwright)

Chromium only for v1 - no cross-browser matrix (see `PROGRESS.md` Day 9). Runs against a real
`next dev` server and a real local Supabase stack, not mocks: auth, RLS, and redirect behaviour
are exercised for real.

## Precondition: local Supabase running

Same as Day 2's local dev setup - Docker Desktop must be running, then:

```bash
npx supabase start
```

Leave it running for the duration of the e2e run (and for `npm run dev` generally). `npx
supabase status` reprints the URL/keys if you need them.

## Running the suite

```bash
npm run test:e2e
```

This starts `next dev` itself via Playwright's `webServer` config (reusing an already-running
dev server on port 3000 if you have one - see `playwright.config.ts`) and manages the whole
lifecycle. You don't need to start `npm run dev` separately, though it's harmless if it's
already up.

To run a single spec file or filter by title:

```bash
npx playwright test e2e/journeys/calculators.spec.ts
npx playwright test -g "signup"
```

To see the HTML report from the last run:

```bash
npx playwright show-report
```

## How authentication works in these specs

- `e2e/auth.setup.ts` runs first (see the `setup` project in `playwright.config.ts`, and every
  other project's `dependencies: ["setup"]`). It seeds a dedicated E2E user
  (`e2e-user@taxops.local` by default - override with `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`)
  directly via the Supabase **service-role** client (`auth.admin.createUser` with
  `email_confirm: true`), which bypasses email confirmation entirely regardless of the
  project's `enable_confirmations` setting. It then signs in through the real `/sign-in` form
  and saves the resulting session cookies to `e2e/.auth/user.json` (gitignored - never commit
  this file, it's a live session).
- The `chromium` project applies that storage state by default, so most specs
  (`e2e/journeys/profile-wizard.spec.ts`, `checklists.spec.ts`, `calculators.spec.ts`, etc.)
  start already authenticated.
- Specs that need to exercise the unauthenticated flow itself (`signup.spec.ts`,
  `signin.spec.ts`, `proxy-protection.spec.ts`, and the auth-surface screenshots) reset storage
  state with `test.use({ storageState: { cookies: [], origins: [] } })` at the top of the file.
  Signup uses a fresh throwaway email per run (`e2e-signup-<timestamp>@taxops.local`); local
  Supabase has `enable_confirmations = false` (`supabase/config.toml`), so no real mail
  provider is needed for that flow to complete.

## Why the suite runs serially (`workers: 1`, `fullyParallel: false`)

Every spec shares the **one** seeded E2E user's database rows - there's no per-test user
provisioning. Specs that need a truly blank tax profile (the wizard regression-pin spec, the
keyboard-only journey, the wizard-step axe scan) reset it themselves via
`e2e/lib/supabase-admin.ts`'s `resetE2EUserData`, and the checklists spec deliberately targets
the "Receipts & evidence" group (always shown regardless of profile answers - see
`ALWAYS_DEFAULT_GROUP_IDS`) so it doesn't depend on what another spec file left behind. Serial
execution is what makes sharing one user safe without building out per-test user provisioning,
which would be more infrastructure than this suite's size justifies.

## Screenshots (`e2e/screenshots/`)

`e2e/visual/screenshots.spec.ts` captures full-page PNGs of every major surface (marketing
home, auth pages, dashboard, wizard step, all three calculators with results, tips index +
article, checklists) and commits them under `e2e/screenshots/` as a **review artifact**, not a
pass/fail test - there's no pixel-diffing in v1 (no flake budget for that yet). Re-run and
re-commit whenever a surface changes meaningfully:

```bash
npx playwright test e2e/visual/screenshots.spec.ts
```

## CI

`.github/workflows/ci.yml`'s `e2e` job installs the Supabase CLI (`supabase/setup-cli`), runs
`supabase start`, installs the Chromium browser, and runs `npm run test:e2e`, uploading the
Playwright HTML report and `e2e/screenshots/` as build artifacts. It needs a
`CI_SUPABASE_SERVICE_ROLE_KEY` repository secret (the local Supabase CLI's fixed dev
service-role key - safe to store as a secret since it only ever points at an ephemeral
CI-local Postgres instance, never a real project).

## Known environment quirks (see PROGRESS.md Day 9 for the full writeup)

- **Cold `next dev` (Turbopack) compiles are slow the first time a route is hit** - `e2e/auth.setup.ts`
  visits every route the suite touches once, before any spec's own (tighter) assertions run, to
  move that cost out of individual test bodies.
- **`react-hook-form`'s uncontrolled default values aren't in the server-rendered HTML** - the
  three calculator forms show empty fields for a moment after `next dev` first serves the page,
  then react-hook-form populates them client-side. Filling a field before that populate step
  races it, which can double the value (`"800"` -> `"800800"`) - use
  `e2e/lib/form.ts`'s `fillNumberField`, which waits for the field to be non-empty first.
- **The Next.js Dev Tools floating button** (dev-mode only) has the accessible name "Open
  Next.js Dev Tools", which is a substring match for `getByRole("button", { name: "Next" })`
  under Playwright's default (non-exact) matching. Use `{ name: "Next", exact: true }` for any
  button literally named "Next".
