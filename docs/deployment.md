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
   §6):
   - **Project URL** (`https://<ref>.supabase.co`)
   - **anon / publishable key**
   - **service-role key** — copy it somewhere private for the RLS smoke test (§4) and never
     put it in a client-side env var or commit it anywhere. It is not needed by the deployed
     app itself (see §6's env var table — the app only ever uses the anon key).
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
`checklist_custom_items`, `saved_articles`, `saved_scenarios`, all RLS-enabled).

**Confirm with `supabase migration list --linked`**, not `supabase db diff --linked` — `db diff`
needs to spin up a local Docker shadow database to compare against, which hits the same flaky
CloudFront image-pull issue Day 2's PROGRESS.md already documented for `studio`/`edge_runtime`.
`migration list --linked` does the same "did everything apply" check (compares local migration
filenames against the remote project's applied-migrations table) without needing Docker at all:

```bash
npx supabase migration list --linked
```

Expect the `Local` and `Remote` columns to match exactly, one row per migration file, both showing
the same timestamp-prefixed IDs. Verified 2026-07-13 against `taxops-staging`: all three matched
with no drift.

**No seed data goes to staging.** `supabase/seed.sql` is explicitly commented "local dev seed
data only, never run against a production project" and `db push` doesn't run it regardless — the
staging project starts with an empty schema. The RLS smoke script (§4) and the human smoke test
(§9) both create their own users through the app/API rather than depending on seeded rows.

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

All 31 assertions (anon rejection at both the RLS and privilege layers, cross-user read/write/
delete denial, partial-upsert isolation, on `profiles`, the Day 8 checklist tables, and
`saved_articles`/`saved_scenarios`) should pass identically to the local run. **The service-role
key only ever lives in your local shell environment for this one command** — it is never written
to a file in this repo, never set as a Vercel env var, and never shipped to the browser.

**Finding from 2026-07-13, now fixed**: the first staging run of this script was 19/20 - "anon
select was rejected (permission denied)" returned zero rows with **no error** instead. Root cause
(investigated with `supabase db query --linked`, read-only, no dashboard needed): the hosted
project has a schema-level `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO anon,
authenticated, service_role` set for the `postgres` role in `public` - a platform bootstrap
default the local CLI's Docker image doesn't replicate. Every `CREATE TABLE` in every migration
silently inherited this, regardless of what the migration itself explicitly granted. **Not a
data exposure at the time** - RLS was enabled on every table and correctly scoped every
authenticated access; `anon` could issue the SQL but had no `auth.uid()`, so RLS filtered every
row to the same practical zero-rows outcome as a hard rejection, just via a different mechanism.
Still a real defense-in-depth gap (a future table added without RLS enabled would have had zero
protection instead of one layer) - see PROGRESS.md's Day 10 entries for the full investigation.

**Fixed by `supabase/migrations/20260713030000_harden_data_api_grants.sql`**: revokes every
grant on all five tables from `anon`/`authenticated`/`service_role`, then re-grants exactly the
explicit per-table privileges this project has always declared (`select, insert, update, delete`
for `authenticated`; `all` for `service_role`; nothing for `anon`), and adds
`alter default privileges in schema public revoke all on tables from anon, authenticated,
service_role` so the same drift can't reappear for any future table created by a migration
(explicit per-table grants are now mandatory going forward, not optional - matching the
convention every migration already followed). Applied locally (`supabase db reset`) and pushed
to staging (`supabase db push`) on 2026-07-13; `information_schema.role_table_grants` confirms
`anon` now has zero rows on any `public` table on both, and `authenticated` lost the incidental
extra `REFERENCES`/`TRIGGER`/`TRUNCATE` privileges the same default had leaked to it (tightened
to exactly `SELECT`/`INSERT`/`UPDATE`/`DELETE`, matching intent). `scripts/smoke-test-rls.mjs`
section 5 now pins this explicitly - `anon` select *and* insert on every table must fail with
Postgres error `42501` (`insufficient_privilege`), not just return an empty/RLS-filtered result -
so this can't silently regress again.

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

**Verified 2026-07-13, partial**: Site URL and the redirect allowlist aren't readable from
outside the dashboard — there's no CLI command or Management API call available in this
environment that returns them, and Supabase's public `/auth/v1/settings` endpoint (which *is*
readable with just the anon key, no dashboard access needed) doesn't include either. What that
endpoint does confirm: `"mailer_autoconfirm": false` — email confirmation **is** ON, matching
this section's requirement. Site URL and the redirect allowlist still need your own dashboard
confirmation against the values above once the Vercel URL (§6) is settled.

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

**Deployment Protection stays ON** (confirmed decision, 2026-07-13) - every URL for this project
redirects with `302` to `vercel.com/sso-api?...` (Vercel's own SSO gate, not this app's
`proxy.ts`) unless the request carries a valid bypass credential. Automated checks (this doc's
build-success/`proxy.ts`/env-leakage checks, and any future CI job that needs the deployed URL)
authenticate past it with the **Protection Bypass for Automation** header:

```bash
curl -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
  https://<deployment-url>/some-path
```

(`?x-vercel-set-bypass-cookie=true` as a query param on the first request also works, for a
browser session that needs to stay past the gate across multiple page loads - not needed for
one-off curl checks.)

The secret itself is generated once in **Settings → Deployment Protection → Protection Bypass
for Automation** and referenced by name everywhere after - `VERCEL_AUTOMATION_BYPASS_SECRET`,
never its value, in this doc, in CI (§8), or in any command's visible output/logs.

**Verified reachable 2026-07-13**: `VERCEL_AUTOMATION_BYPASS_SECRET` confirmed present both as a
GitHub Actions secret (`gh secret list`) and in this machine's registry-level User environment
scope (readable via `[Environment]::GetEnvironmentVariable(...)`, though not by every shell -
see the note below on a real environment quirk this surfaced).

**Verification result: a real outage, found, not fixed.** With the bypass header attached, every
route tried - `/`, `/tips`, `/sign-in`, `/sign-up`, `/dashboard`, `/auth/confirm` - returns
**`500 Internal Server Error`**, reproduced 3 times consecutively (not transient). Static assets
serve fine in the same deployment (`/favicon.ico` → `200`, correct headers, correct content),
which narrows this precisely: **it isn't a build failure** (the build produced a working static
asset bundle), it's something that runs on *every* non-static request, including a fully static
page like `/sign-in` that has no reason to fail on its own. That pattern matches exactly one
thing in this codebase: `proxy.ts`'s matcher covers everything except static assets/images, and
every invocation calls `updateSession()` (`src/lib/supabase/middleware.ts`), which calls
`requireEnv("NEXT_PUBLIC_SUPABASE_URL")` and `requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")` -
each throws a hard `Error` if its variable is missing. **Diagnosis**: one or both of those two
env vars isn't actually reaching the deployed Edge Middleware runtime, even though (per your
earlier message) they were set in the Vercel dashboard. `NEXT_PUBLIC_SITE_URL` is not used by
`proxy.ts` at all (only by the auth Server Actions building email links), so it's specifically
one of the two Supabase vars.

**Not fixed by this agent** - no Vercel dashboard/API access exists in this environment to
inspect or correct env var scoping (this is exactly the same human-owned boundary as project
creation in §1/§6). Worth checking directly in **Settings → Environment Variables**:
- Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present for whichever
  environment scope this deployment belongs to (Production vs Preview) - a var added only under
  "Production" won't be visible to a Preview deployment's functions, and vice versa.
- Both are scoped to **Runtime**, not Build-time only - `proxy.ts` reads `process.env` live on
  every Edge Middleware invocation, not from values baked in at build time the way client-bundle
  `NEXT_PUBLIC_*` references are.
- No typo in either variable name (a misspelled name is indistinguishable from "not set" to
  `requireEnv`).
- After any correction, a **new deployment** may be needed - Vercel's env var changes don't
  always retroactively apply to an already-built deployment's running functions.

Every other check this section describes (`proxy.ts` redirect behavior, public page content,
env-leakage in delivered HTML) is blocked behind this 500 - there's no successful response yet
to inspect for any of them. Re-run the same curl checks once the env var issue is corrected;
they're one command away, not blocked on anything else.

**A smaller environment quirk surfaced along the way, worth recording**: this agent's own Bash
shell did not see the newly-set `VERCEL_AUTOMATION_BYPASS_SECRET` even after confirming (via
PowerShell's `[Environment]::GetEnvironmentVariable(..., 'User')`, which reads the registry
directly) that it was actually set. A long-running shell process only has the environment it
inherited at its own startup - setting a new User/Machine env var afterward doesn't retroactively
appear in already-running processes, only in new ones. PowerShell tool calls in this session
happen to start fresh each time (so they saw it immediately); this session's Bash tool calls do
not. If a future "I set an env var, please check it" request seems to fail even though the
value is confirmed in the registry/dashboard, try reading it through a different tool/process
before concluding it's genuinely unset.

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

**CI does not exercise the deployed URL - deploy checks are manual for v1, by explicit
decision, not an oversight.** `VERCEL_AUTOMATION_BYPASS_SECRET` is set as a GitHub Actions secret
(confirmed via `gh secret list`, 2026-07-13) but no workflow job references it. Reasons this is
staying manual rather than wired in now:

- The `e2e` job's whole design (Day 9) is testing against a disposable, ephemeral local Supabase
  instance the CI runner starts and tears down itself - adding a second, unrelated concern
  (does the *deployed* app respond) to that job would conflate "did the app's own logic break"
  with "is today's Vercel deployment currently healthy," which are different questions with
  different remediation paths.
- As of 2026-07-13 the deployed URL is returning `500` on every route (§6's finding) - wiring an
  automated check against it right now would make CI red for an infrastructure/env-var reason
  unrelated to code changes, which is exactly the kind of flaky-for-the-wrong-reason signal a CI
  gate shouldn't have.

If this project later wants an automated post-deploy check, the mechanism is the same
bypass-header pattern used manually above, referenced by secret name only:

```yaml
- name: Check staging deploy responds
  run: |
    curl -sf -H "x-vercel-protection-bypass: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}" \
      https://<staging-url>/tips
```

(no separate `env:` block needed - `${{ secrets.* }}` interpolates directly into `run:` steps)
- revisit only once the deployment itself is confirmed healthy, so a new automated check starts
green rather than red.

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
