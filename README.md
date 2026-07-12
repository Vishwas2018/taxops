# TaxOps

An Australian-focused educational SaaS portal for daily-rate contractors and property
investors: guided tax profile, calculators, EOFY checklists, and a tax tips knowledge base.

**TaxOps is educational only.** It never lodges returns, never submits to the ATO, never
gives personal advice, and never guarantees outcomes. Every calculator, checklist, and
article carries a disclaimer directing users to a registered tax agent.

See [`CLAUDE.md`](./CLAUDE.md) for the full project constitution (scope, stack decisions,
disclaimer rules, calculation rules) and [`PROGRESS.md`](./PROGRESS.md) for build status.

## Stack

Next.js 16 (App Router, TypeScript strict) · Supabase (Postgres, Auth, RLS) · Tailwind CSS +
shadcn/ui · Zod · Vitest · Playwright · Vercel.

## Getting started

Requirements: Node 20+, npm, Docker Desktop (for local Supabase), Supabase CLI.

```bash
npm install

# start local Supabase (Postgres + Auth), requires Docker Desktop running
npx supabase start

# copy the local Supabase URL/anon key printed above into .env.local
cp .env.local.example .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (single run) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with coverage (100% enforced on `src/lib/tax/`) |
| `npm run e2e` | Playwright critical-path e2e suite |

Run the full quality loop before committing:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Project layout

See the "Directory structure" section of [`CLAUDE.md`](./CLAUDE.md).

## Database

Schema and RLS policies live in `supabase/migrations/`. Every user-owned table has RLS
restricting rows to their owner. See `supabase/seed.sql` for local dev seed data.

## Deployment

Hosted on Vercel. Production Supabase project and environment variables are provisioned at
the Day 10 human gate — see `PROGRESS.md`.
