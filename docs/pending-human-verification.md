# Pending human verification (as of Day 15.5)

Feature work is paused until these clear. Each item names exactly what's outstanding, why it
can't be closed out by an agent, and what it blocks — so the next day's work knows what it's
still waiting on instead of re-discovering it.

## 1. Staging smoke test (`docs/deployment.md` §9)

**Outstanding**: the manual, real-browser walkthrough of the deployed staging app — sign up with
a real email, click the confirmation link, complete the tax profile wizard, run one calculator,
toggle one checklist item and confirm it persists. Every other Day 10 verification step (RLS,
migrations, redirect behavior, env-var leakage, deploy health) has been re-confirmed multiple
times since (see PROGRESS.md's Day 10 continuation entries); this is the one step nothing but a
human clicking through a real inbox and a real browser session can complete.

**Why an agent can't close this**: it requires receiving a real confirmation email and clicking
a real link from it — there's no automated substitute that verifies the same thing (email
deliverability + Supabase Auth's PKCE callback + the deployed app's own redirect handling, all
three together, as an actual user would experience them).

**Status**: asked for at the end of Day 10 (2026-07-13); PROGRESS.md's Day 11 entry noted it
"arrived unfilled" and flagged rather than assumed; still not supplied as of this entry.

**Blocks**: treating Day 10 (deployment prep) as closed. Nothing downstream is technically gated
on this — the app has kept shipping — but Day 10 itself stays open until it's done.

## 2. Gate 2 — article + calculator content review against ATO guidance

**Outstanding**: human review of every article's content and every calculator's output copy
against ATO guidance, per CLAUDE.md's v1 scope note and the Human Gates list in PROGRESS.md.
Until this review happens, articles stay `draft: true` (the 3 Day 6 seed articles are the one
documented exception, shipped `draft: false` as pipeline-proving placeholders — they still need
this same review, not a pass by default). 6 further Day 11 articles are `draft: true` pending
the same review, with source URLs that are structurally accurate but not browser-click-verified.

**Why an agent can't close this**: the gate is explicitly a *human* sign-off step by design (see
CLAUDE.md's module 4 description and PROGRESS.md's own Gate 2 note) — it's a policy checkpoint,
not a verification an agent re-running its own citations can satisfy on its own behalf.

**Blocks**:
- Flipping any `draft: true` article to `draft: false` (published).
- A future CGT estimator calculator's content pairing — a new calculator needs an accompanying
  article per the existing calculator/article pattern, and that article would itself need this
  same review before publishing, so starting a CGT estimator now would just create more content
  stuck behind the same unresolved gate.

## 3. Gate 3 — HELP/STSL repayment thresholds, direct ATO click-verify

**Outstanding**: `fy2026-27.ts`'s HELP/STSL repayment thresholds ($69,528 / $129,717 / $186,050)
are marked `verified: true`, but that verification is five independent secondary sources
agreeing with each other — every direct fetch attempt against the actual ato.gov.au page
returned `HTTP 403` (bot-blocked, the same standing limitation `docs/updating-tax-data.md` §2
documents across multiple days and tools). No human has yet clicked through to the live ATO
page in a real browser to confirm these figures directly against the primary source.

**Why an agent can't close this**: per `docs/updating-tax-data.md` §2, verifying ato.gov.au
figures is a human, browser-based step — automated fetching from this environment doesn't work
against that domain, full stop, not something to keep retrying.

**Blocks**: full confidence in the FY2026-27 config as a whole. The Day 15 Gate 3 sign-off table
(PROGRESS.md) already flagged this same class of caveat for the Medicare low-income thresholds
(`pendingIndexation: true`, carried forward unconfirmed) and the standard work-related
deduction's eligibility scope (lower confidence); this item adds the HELP/STSL thresholds
specifically to that same "needs a human's own browser" list, since every calculator that
touches HELP repayment (`contractor-take-home`, `tax-set-aside`) depends on this figure being
right.

## 4. Design audit + polish notes — Day 12 Part B

**Outstanding**: Day 12 Part A (2026-07-15) fixed the *findings* from the Day 11.9 self-audit
(mobile nav, disclaimer duplication, radii, elevation). It did not do a fresh design pass over
everything shipped since. A "Day 12 Part B" task did land (2026-07-16, see PROGRESS.md) - two
restrained hero moments (dashboard header, calculator results panels) plus a real contrast bug
fix it turned up along the way - but its own findings/notes input arrived unfilled, so what
shipped was an **agent self-review** against `docs/design.md`'s vocabulary, not the external
audit this item was actually asking for. This item stays open on that basis.

**Why an agent can't close this**: a design audit is a subjective visual/UX review by design —
an agent auditing its own UI output isn't the independent check the audit is meant to be (the
2026-07-16 pass proves the point in practice, not just in theory - it could self-review the two
hero moments it was told to build, but had nothing to say about anything else that might need
attention). The regenerated `e2e/screenshots/audit/*` set (both this entry and the 2026-07-16
before/after set) exists specifically to give that human review something current to look at.

**Blocks**: Day 12 Part B itself, and any further visual/UX polish work that would want to build
on an agreed baseline rather than guess at one.

## What is *not* blocked

Everything already shipped (Days 1–15) stays as-is; this list only pauses **new** feature work
(no new calculators, no dark mode, no CGT estimator) until the above clear. Bug fixes, data
corrections (like this same Day 15.5 entry's date fixes), and documentation stay in scope.
