# Deployment (Day 10 — staging, not launch)

Scope: **one staging environment** — Vercel (preview/staging deployments) + a single hosted
Supabase project on the free tier. No production project yet, no custom domain, no Gate 3
sign-off. Goal: a working staging URL with the full migration + seed flow documented and
repeatable by a second developer, not a public launch.

Repo: https://github.com/Vishwas2018/taxops (public).

## 1. Supabase staging project (human-owned — dashboard clicks, not CLI)

Project creation and every secret stay human-owned. These are the exact steps; nothing here is
run by the agent.

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Organization: your existing org (any of the ones already in the account is fine — this is a
   disposable staging project, not tied to a specific client/org).
3. Name: `taxops-staging` (keeps it unambiguous next to your other projects).
4. Database password: generate a strong one, **save it in your password manager** — it's shown
   once. Not needed for anything in this doc (the app never connects directly to Postgres; only
   through Supabase's REST/Auth APIs), but Supabase requires it at creation time.
5. Region: pick whatever's closest to you or your team — this is staging, not
   latency-sensitive.
6. Plan: **Free**.
7. Create, wait for provisioning (~2 minutes).
8. From the project's **Settings → API** page, note down (you'll paste these into Vercel later,
   §5):
   - **Project URL** (`https://<ref>.supabase.co`)
   - **anon / publishable key**
   - **service-role key** — copy it somewhere private for the RLS smoke test (§3) and never
     put it in a client-side env var or commit it anywhere. It is not needed by the deployed
     app itself (see §5's env var table — the app only ever uses the anon key).
9. Note the **project ref** (the `<ref>` in the URL / the string after `db.` in the database
   host) — needed for `supabase link` below.

## 2. Link the local repo to the staging project

```bash
npx supabase login          # if not already logged in
npx supabase link --project-ref <ref>
```

This writes `supabase/.temp/project-ref` (gitignored by the Supabase CLI's own scaffold) —
it does not touch anything committed to the repo.

## 3. Push migrations — `db push`, never `db reset`

**This is the one instruction in this whole doc that matters most to get right.**

| Command | What it does | Where it's safe |
|---|---|---|
| `supabase db reset` | Drops and recreates the *entire* local shadow database, replays every migration from scratch, then runs `supabase/seed.sql` | **Local only.** Every prior day's PROGRESS.md uses this against the Docker-based local stack. |
| `supabase db push` | Applies only the migrations not yet recorded as applied, in order, against whatever project you're linked to. Never drops anything, never runs `seed.sql`. | **Hosted projects (staging, and later production).** |

Running `db reset` against a linked hosted project would drop and recreate that project's
database — there is no "oops, undo" for a hosted project the way there is for a disposable local
Docker volume. **Never run `supabase db reset` while linked to `taxops-staging` or any future
production project.** If you're ever unsure which target a command will hit, run
`npx supabase projects list` and check which one shows `"linked": true` first.

Push migrations:

```bash
npx supabase db push
```

This applies, in order: `20260712000000_init_schema.sql`, `20260713010000_tax_profile_interview.sql`,
`20260713020000_eofy_checklists.sql` — the full current schema (`profiles`, `checklist_item_states`,
`checklist_custom_items`, `saved_articles`, `saved_scenarios`, all RLS-enabled). Confirm via the
dashboard's **Table Editor** or `npx supabase db diff --linked` (should report no pending changes
afterward).

**No seed data goes to staging.** `supabase/seed.sql` is explicitly commented "local dev seed
data only, never run against a production project" and `db push` doesn't run it regardless — the
staging project starts with an empty schema. The RLS smoke script (§4) and the human smoke test
(§8) both create their own users through the app/API rather than depending on seeded rows.

## 4. Verify RLS on staging

`scripts/smoke-test-rls.mjs` now works against either environment (Day 10 change: it ensures its
own demo user exists via the service-role admin API instead of assuming `seed.sql` ran, since
staging has no seed step at all). Point it at staging with env vars instead of the local
defaults:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co" \
SMOKE_TEST_ANON_KEY="<anon key>" \
SMOKE_TEST_SERVICE_ROLE_KEY="<service-role key>" \
node --no-warnings scripts/smoke-test-rls.mjs
```

All 20 assertions (anon rejection, cross-user read/write/delete denial, partial-upsert
isolation, on both `profiles` and the Day 8 checklist tables) should pass identically to the
local run. **The service-role key only ever lives in your local shell environment for this one
command** — it is never written to a file in this repo, never set as a Vercel env var, and never
shipped to the browser.

## 5. Auth config for hosted (staging behaves like production)

Unlike local dev (`enable_confirmations = false` in `supabase/config.toml`, so Day 9's E2E suite
never depends on real email), **hosted staging should have email confirmation ON** — it's meant
to exercise the same auth flow production will use, not the local shortcut.

In the staging project's dashboard, **Authentication → URL Configuration**:

1. **Site URL**: your primary Vercel deployment URL once it exists (§6) — e.g.
   `https://taxops.vercel.app`. Used to build the base of email links.
2. **Redirect URLs** (the allowlist Supabase checks `next`/`redirect_to` params against): add
   every domain the app might redirect back to after an email link is clicked:
   - `https://taxops.vercel.app/**` (production/staging alias, if you set one up)
   - `https://*.vercel.app/**` — Vercel preview deployments get a unique URL per branch/PR;
     wildcarding is the practical way to keep preview auth working without adding one entry per
     preview. (If your Supabase plan/version doesn't support the `*` wildcard segment here, add
     the specific preview URL you're testing against instead, and revisit if previews become a
     regular part of the workflow.)
   - `http://localhost:3000/**` — keeps local dev's auth links working against the *staging*
     project too, useful if you ever point local dev at staging instead of the local stack.

In the staging project's dashboard, **Authentication → Providers → Email**:

3. **Confirm email**: ON (this is the default — just don't turn it off, unlike local's
   `config.toml` override).

**The PKCE callback URL** (from Day 2): `src/app/auth/confirm/route.ts` is the route that
exchanges an emailed `code` for a session (`supabase.auth.exchangeCodeForSession`). Every
Supabase auth email (`signUp`'s confirmation link, `resetPasswordForEmail`'s reset link) is built
by the app as `${getSiteUrl()}/auth/confirm?next=<destination>` (see `signUpAction`/
`requestPasswordResetAction` in `src/app/(auth)/actions.ts`). For that link to work in a
deployed environment, `NEXT_PUBLIC_SITE_URL` (§6's env var table) must be set to the actual
deployed origin — if it's left at its `http://localhost:3000` fallback, every confirmation/reset
email sent from staging would link back to `localhost` instead of the real staging URL. This is
a real, easy-to-miss deploy footgun: **the env var and the Supabase redirect allowlist both need
to agree on the deployed domain, or the confirm link either 404s or gets rejected by Supabase's
own redirect check.**

## 6. Vercel project

Connect via the dashboard (same human-owned pattern as Supabase — account/team/billing choices
stay yours):

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select
   `Vishwas2018/taxops`.
2. Framework preset: Vercel auto-detects Next.js — leave defaults (build command `next build`,
   output managed by the Next.js framework preset, install command `npm install`).
   `npm ci --legacy-peer-deps` is what CI uses (see Day 1's peer-dep note in CLAUDE.md); if
   Vercel's default `npm install` hits the same shadcn/babel peer conflict, override the install
   command to `npm install --legacy-peer-deps` in **Settings → General → Build & Development
   Settings**.
3. Environment variables — add these before the first deploy (**Settings → Environment
   Variables**, or the import screen's env var step):

| Name | Scope | Value comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Build + Runtime, all environments | Staging project's Settings → API → Project URL (§1) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build + Runtime, all environments | Staging project's Settings → API → anon/publishable key (§1) |
| `NEXT_PUBLIC_SITE_URL` | Build + Runtime, all environments | The deployment's own origin — Vercel's `Production` env gets the stable alias (e.g. `https://taxops.vercel.app`); Preview deployments get a per-deployment URL, which Vercel exposes as the system env var `VERCEL_URL` (see note below) |

No other env vars are needed. The app never reads a service-role key at runtime (only
`scripts/smoke-test-rls.mjs` and the Day 9 E2E setup use one, both dev-machine/CI-only, never
imported by anything under `src/`) — confirmed by grepping `src/` for `SERVICE_ROLE` (zero
hits). Every env var here is intentionally `NEXT_PUBLIC_*`: the anon key is designed to be
public (RLS is the real access boundary, per Day 2), and the site URL is just used to build
link text, not to authenticate anything.

**`NEXT_PUBLIC_SITE_URL` on Preview deployments**: a plain static value in the Vercel dashboard
would be wrong for every preview (each gets its own URL). Vercel's own recommended pattern is a
build-time expression referencing its system env var, e.g. setting the Preview-scoped value to
`https://$VERCEL_URL` (Vercel exposes `VERCEL_URL` automatically, no configuration needed) so
each preview computes its own correct site URL. Set `NEXT_PUBLIC_SITE_URL` to your stable
`https://taxops.vercel.app` for the **Production** environment scope, and to
`https://$VERCEL_URL` for the **Preview** environment scope. If a preview's computed URL isn't
in Supabase's redirect allowlist wildcard (§5), auth email links from that specific preview
won't come back correctly — expected for one-off previews, not a bug.

4. Deploy. Confirm the build succeeds and check the build log for `proxy.ts` — Next 16 renamed
   `middleware.ts` → `proxy.ts` (Day 2), which is new enough (post-dates most Vercel
   documentation/tutorials in general circulation) to verify rather than assume it behaves
   identically on Vercel's edge network. Confirm directly, not by inference:
   - Build log should show a `ƒ Proxy (Middleware)` line (matches the local `next build` output
     from Day 9 verification), not a warning about an unrecognized file.
   - Once deployed, hit the deployed URL's `/dashboard` unauthenticated — it should redirect to
     `/sign-in?redirectTo=%2Fdashboard`, the same behavior verified locally on Day 2 and in Day
     9's `e2e/journeys/proxy-protection.spec.ts`. If it 404s or serves `/dashboard` directly
     instead of redirecting, `proxy.ts` isn't running on the deployed edge network the way it
     does in `next dev`/`next build` locally — stop and investigate before treating the deploy
     as done.
5. Confirm no unintended env leakage: **Settings → Environment Variables** should show exactly
   the three `NEXT_PUBLIC_*` vars above. Anything without that prefix is server-only by Next.js
   convention and won't reach the browser bundle regardless, but there shouldn't be anything
   else here to leak in the first place per this project's minimal env surface.

## 7. Migration discipline going forward (starts now, permanently)

Days 7 and 8 both dropped and replaced whole tables/columns mid-development (documented
explicitly in PROGRESS.md both times, justified by "zero application consumers yet"). **That
precedent ends the moment migrations have been pushed to a real hosted project** (§3, done
today) — a drop-and-replace migration against a project with real rows destroys user data, not
just unused scaffolding.

From here on:

- **Additive only.** New columns are nullable or have a safe default; new tables stand alone;
  renaming a column is "add new column, backfill, migrate call sites, drop old column" as
  *separate* migrations across separate deploys, not one migration that renames in place.
- **Order of operations**: run `supabase db push` (or the future CI-driven equivalent) **before**
  the Vercel deploy that depends on the new schema, never after. A deploy that expects a column
  that doesn't exist yet will error at runtime for every request touching it.
- **No down-migrations.** Supabase/Postgres migrations here are forward-only files under
  `supabase/migrations/` — there's no tooling-generated "undo" for a pushed migration. The
  rollback plan is **roll-forward**: write a new migration that reverses the effect (re-add a
  dropped column, drop a newly-added one, etc.), same as any other change. If a bad migration
  has already been pushed, don't hand-edit the database out-of-band — write the correcting
  migration, review it with the same care as the original, and push that.
- Keep migration files immutable once pushed to any shared environment (staging counts). If a
  pushed migration needs a fix, write a new migration - don't edit history.

## 8. CI

`.github/workflows/ci.yml`'s `quality` job needs no new secrets. The `e2e` job (Day 9) runs
Playwright against a **local, ephemeral Supabase instance it starts itself inside the CI
runner** (`supabase start`, not the hosted staging project) — it needs one repository secret:

- **`CI_SUPABASE_SERVICE_ROLE_KEY`**: the local Supabase CLI's fixed development service-role
  key (the same one `npx supabase status` prints locally — it's a well-known, publicly
  documented value for the local dev stack, not a real secret, but stored as a GitHub Actions
  secret anyway rather than hardcoded in the workflow file for cleanliness). Set via
  **Settings → Secrets and variables → Actions → New repository secret** on the GitHub repo, or
  `gh secret set CI_SUPABASE_SERVICE_ROLE_KEY`.

This is **not** the staging project's real service-role key — that one only ever goes in your
own shell environment for §4's manual smoke test, never into GitHub Actions or any other CI/CD
system, since a CI job pointed at hosted staging would mean tests mutating a shared environment
other people/deployments depend on.

A green run at `https://github.com/Vishwas2018/taxops/actions` (both `quality` and `e2e` jobs) is
part of Day 10 being done, not just "the workflow file exists."

## 9. Staging smoke test (manual, in a browser)

Once deployed, walk through the real flow against the live staging URL with a real email
address you control:

1. Sign up with a real email.
2. Check your inbox, click the confirmation link — lands back on the deployed app, signed in
   (proves §5's site URL + redirect allowlist + PKCE callback are all wired correctly together).
3. Complete (or partially complete) the tax profile wizard.
4. Run one calculator.
5. Toggle one checklist item, reload, confirm it persisted.

Record the outcome (pass/fail per step, and the staging URL used) in PROGRESS.md's Day 10 entry.
