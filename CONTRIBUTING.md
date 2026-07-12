# Contributing to TaxOps

## Before you start

Read [`CLAUDE.md`](./CLAUDE.md). It's the project constitution — scope boundaries, disclaimer
rules, and calculation rules are not optional style preferences.

## Workflow

1. Make the smallest change that satisfies the task. No speculative abstractions, no
   out-of-scope features (see "v1 Scope" in `CLAUDE.md`).
2. If you add a dependency, explain why an existing dependency or a built-in couldn't do the
   job — in the commit message.
3. Tax logic changes: add/update tests in the same commit. Boundary values (one cent
   below/at/above a threshold) are not optional.
4. Run the full quality loop before committing:

   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

5. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
   `refactor:`, `test:`, `docs:`, `chore:`).

## Tax rates and thresholds

Never inline a rate, bracket, or threshold. Add it to the relevant
`src/lib/tax/config/FY20XX-XX.ts` file with a comment documenting its source and any
assumptions, then import it into the calculation function.

## Disclaimers

Every calculator result, checklist, and article must render `<Disclaimer />` from
`src/lib/disclaimers/`. Do not paraphrase the standard text. Do not use advisory language
("you should…") anywhere in calculator output or article copy.

## Database changes

New tables need an RLS policy restricting rows to their owner (`auth.uid()`) in the same
migration that creates them. No table ships without RLS.

## Content (MDX articles)

New articles ship with `draft: true` in frontmatter until reviewed against ATO guidance and
approved by a human (see Day 8 gate in `PROGRESS.md`). Include `sources` (ATO URLs) in
frontmatter.
