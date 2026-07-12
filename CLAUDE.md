@AGENTS.md

# TaxOps — Project Constitution

TaxOps is an Australian-focused Next.js SaaS portal helping daily-rate contractors and
property investors understand legal tax optimisation, deductions, and wealth preservation.
Primary persona: a dual-profile PAYG contractor who also holds an ABN and investment
properties, household income $400k–600k (Division 293, PSI rules, and negative gearing are
first-class concerns).

**TaxOps is educational only.** It never lodges returns, never submits to the ATO, never
gives personal advice, never guarantees outcomes.

## 1. Simplicity First

- No new dependency without written justification in the commit message explaining why an
  existing dependency or built-in can't do the job.
- Pure functions for all calculation logic. No hidden state, no I/O inside `src/lib/tax/`.
- Server components by default. Only add `"use client"` where interactivity requires it.
- Reuse existing components (`src/components/ui/`) before adding new ones.
- No features outside the v1 scope below, ever, without an explicit human request.

## 2. Strict Tax Disclaimer

- Every calculator result, checklist, and article renders the shared `<Disclaimer />`
  component from `src/lib/disclaimers/`.
- No advisory language ("you should claim…", "we recommend…"). Describe what a rule *is*,
  never what the user *should do*.
- Calculator outputs are always labelled as **estimates** with the applicable financial year
  displayed next to the result.
- Standard disclaimer text (do not paraphrase):

  > This information is general and educational only and does not consider your personal
  > circumstances. Tax laws and eligibility requirements can change. Consult a registered tax
  > agent or appropriately qualified adviser before acting on this information.

## 3. Scope boundaries (hard)

No lodgement. No ATO submission. No personal advice. No accounting ledgers. No investment
execution. No property management. If a request would cross one of these lines, stop and
record it in `PROGRESS.md` under "BLOCKED" rather than building it.

## 4. Calculation rules

- All tax logic lives in pure, deterministic, tested functions under `src/lib/tax/`.
- All rates/thresholds live in versioned config files under
  `src/lib/tax/config/FY2025-26.ts` — one file per financial year. Never inline a rate or
  threshold in a calculation function; always import it from config.
- Every assumption a calculation makes must be documented as a comment on the config value or
  function it affects.
- Every threshold must have a boundary test (one cent below, at, one cent above).

## 5. Privacy

- Row Level Security enabled on every user table; policies restrict read/write to
  `auth.uid()`.
- Collect only what a feature needs — no speculative columns.
- No financial data in logs (`console.log`, error reporting, analytics events).
- Zod-validate all inputs server-side, even if already validated client-side.

## 6. Accessibility

Semantic HTML, labelled form fields, visible focus states, full keyboard navigability, no
colour-only meaning (pair colour with icon/text/pattern).

## 7. Quality loop

After every feature: `npm run typecheck && npm run lint && npm test && npm run build`. Fix all
failures before moving on. Commit with Conventional Commits after each green cycle.

## The three unforgivable shortcuts

Never weaken a disclaimer. Never skip a test. Never inline a tax rate. If a shortcut looks
tempting under time pressure, it means the task needs to be broken down further, not that the
rule should bend.

---

## v1 Scope — exactly these five modules

1. **Guided Tax Profile** — option-based interview (employment type: PAYG / ABN / both;
   business structure; investment property count; super contribution habits; expense
   categories; other income). Stored per user. Drives which content/calculators/checklists
   are surfaced. Never generates advice.
2. **Calculators** (pure engine in `src/lib/tax/` + thin client UI each):
   - Contractor take-home pay (day rate → annual, PAYG vs ABN/company, Medicare levy, super
     guarantee)
   - Income tax + super estimate (incl. Division 293 exposure above $250k)
   - Property investment cash flow (rent, expenses, interest, negative gearing at marginal
     rate)
   - Property depreciation estimate (Division 40/43, simplified, clearly labelled indicative)
   - Deduction scenario comparison (with/without a set of deductions)
3. **EOFY Checklists** — templated per profile type (contractor / investor / both),
   user-checkable items persisted to Supabase, includes a "questions for your tax agent"
   section.
4. **Tax Tips Knowledge Base** — MDX articles under `content/`, four categories:
   contractor-expenses, property-deductions, superannuation, wealth-preservation.
   Frontmatter: `title, category, financialYear, reviewedDate, sources, profileTags, draft`.
   All articles ship `draft: true` until the Day 8 human gate approves them.
5. **Dashboard** — saved articles, checklist progress, saved calculator scenarios, tax
   profile summary, account settings. No newsletter, no email provider in v1.

## Database schema

`profiles` (1:1 `auth.users`, tax-profile answers as typed columns, not a JSON blob),
`checklists`, `checklist_items`, `saved_articles`, `saved_scenarios` (calculator name,
Zod-validated inputs as JSON, `created_at`). RLS policy on every table restricting rows to
their owner.

## Stack decisions — committed, do not revisit

| Decision | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components **disabled** — see below), TypeScript strict |
| Database + Auth | Supabase: Postgres, Supabase Auth (email + magic link), RLS on every user table |
| Data access | `@supabase/supabase-js` + `@supabase/ssr`. No ORM. |
| Content | File-based MDX in `content/`. No CMS. |
| Styling | Tailwind CSS v4 + shadcn/ui (on `@base-ui/react`, not Radix — this shadcn version's default) |
| Validation | Zod (v4), shared schemas in `src/lib/validation/` |
| Forms | `react-hook-form` + `@hookform/resolvers/zod`. shadcn's `form.tsx` wrapper isn't in this registry version; a small local wrapper lives in `src/components/ui/form.tsx` once the first form needs it. |
| Testing | Vitest for unit tests (100% coverage enforced on `src/lib/tax/`), Playwright for 5–8 critical-path e2e flows only |
| Package manager | npm only. Some devDependencies require `--legacy-peer-deps` due to a shadcn/babel peer-range conflict on this Next 16 snapshot — this is dev-tooling only, no runtime impact. |
| Hosting | Vercel |
| Local dev DB | Supabase CLI (`supabase start`, requires Docker Desktop running) |

### Next.js 16 naming note

This Next.js version renamed `middleware.ts` → `proxy.ts` (same purpose: run code before a
request completes; used here for optimistic auth redirects on protected routes). Use
`proxy.ts`, not `middleware.ts`.

### Cache Components: intentionally off

Next 16 ships an opt-in `cacheComponents` flag (PPR, `"use cache"`, mandatory `<Suspense>`
boundaries around any dynamic/runtime API). Left disabled for v1: nearly every route in this
app is per-user and auth-gated (dashboard, calculators, checklists), so there's little static
shell to gain, and the discipline it demands (wrapping every `cookies()`/session read in
`Suspense`, tagging caches) is complexity this app doesn't need yet. Revisit only if a
specific page turns out to be a caching win — don't enable it project-wide speculatively.

## Directory structure

```
src/
  app/                     routes (App Router)
  components/ui/           shadcn/ui primitives (generated, treat as vendored)
  components/              app-specific shared components (Disclaimer, nav, etc.)
  lib/tax/                 pure calculation engines
  lib/tax/config/          FY-versioned rate/threshold tables
  lib/validation/          shared Zod schemas
  lib/disclaimers/         <Disclaimer /> component + standard text
  lib/supabase/            Supabase client factories (browser/server)
content/                   MDX articles, by category
supabase/                  migrations, seed script, config.toml
e2e/                       Playwright critical-path specs
```
