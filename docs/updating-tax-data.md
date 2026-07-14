# Updating tax data for a new financial year

Every rate, threshold, and cap TaxOps calculates with lives in one versioned config file per
financial year (`src/lib/tax-config/fy2025-26.ts`, `TaxYearConfig` type in
`src/lib/tax-config/types.ts` — see CLAUDE.md §4). This doc is the annual procedure for adding
the next year's file and cutting over to it, plus the two points in the calendar where this
needs to happen even mid-year, not just at each 30 June rollover.

## 1. Duplicate the config file — don't edit the old one in place

Copy `fy2025-26.ts` to `fy2026-27.ts` (or whatever the new financial year is) and export a new
`fy2026_27: TaxYearConfig` constant. The old file stays untouched and importable — a component
still on last year's config during the cutover keeps working, and the old year's golden-file
tests keep testing exactly what they always tested.

Every value in the new file is a `SourcedValue<T>` (`{ value, source, verified, note? }` — see
`types.ts`). Set `verified: false` on anything not yet independently reconfirmed for the new
year, the same convention `fy2025-26.ts` itself uses for a value carried forward without
reconfirmation. **Never set `verified: true` on a copy-pasted value just because last year's
figure happened not to change** — indexation means "unchanged" needs to be confirmed exactly
like "changed" does; see the near-miss below for what trusting an unconfirmed figure costs.

**There is no single switchover point yet.** `fy2025_26` is imported directly by name in every
calculator component and test file that uses it (grep the codebase for `fy2025_26` to find every
site — currently around a dozen files). Adopting a new year's config today means updating each
import individually, not swapping one central export. If a future day introduces a
`CURRENT_TAX_YEAR_CONFIG` re-export or similar, update this doc to point at that single seam
instead — until then, treat the grep results as the actual list of places to change.

## 2. Click-verify every figure against the real ATO page — a browser, not a fetch tool

**Automated fetching of `ato.gov.au` does not work from this kind of environment.** Every direct
fetch attempt against `ato.gov.au` — across multiple days and multiple tools (`WebFetch` here;
plain HTTP fetches during the original Day 3.5 config work) — has returned `HTTP 403` (bot
detection), including on a URL already cited as a working source in this project's own config.
This isn't a sign a particular URL is wrong; it means **verifying ATO figures is a human,
browser-based step**, not something an agent can complete standalone from inside this repo. Any
day's work that updates `tax-config` and reports every figure as independently re-confirmed
without a real browser in the loop should be treated with the same skepticism as an unconfirmed
`verified: false` value - see PROGRESS.md's Day 11 entry for a concrete instance of this
(new article source URLs added by pattern-matching the existing config's own citations, not
by a completed browser click-through).

When a browser **is** available, click through to the actual current-financial-year page for
every value being updated - not last year's cached mental model of where the figure lives or
what it said. ATO restructures page paths periodically (already flagged as a risk at Human Gate
1), and even a page at a stable URL can have this year's figure differ from what the same page
showed last year.

### The Day 3.5 near-miss: a wrong-year figure, correctly labelled as the right year

During the original FY2025-26 config work, a search for HELP/STSL repayment thresholds returned
`$69,528 / $129,717 / $186,050` from a secondary source whose title said **"...for 2026"** - read
at a glance, that looks like FY2025-26. A second, more targeted search revealed those are
actually the **indexed FY2026-27** thresholds; a site titled "for 2026" was describing the
calendar year a rate takes effect partway through, not the financial year label TaxOps uses.
Had the first result been used uncritically, every HELP repayment estimate in the app would
have been silently wrong for a full year. **The general lesson**: a source's own year label is
not sufficient confirmation on its own - cross-check the figure against a second independent
source, and where possible against an internal consistency check (Day 3.5 confirmed its HELP
cap threshold this way: `(179,286 − 125,000) × 0.17 + 8,700 ≈ 179,286 × 0.10`, tying two
independently-sourced figures together mathematically rather than trusting either alone).

## 3. Regenerate golden-file tests for every changed value

Each calculator engine (`src/lib/calculators/*.test.ts`) has one golden-file test with a fully
hand-computed expected value in a comment next to the assertion, plus boundary tests (one cent
below/at/above) for every threshold. When a config value changes:

- Recompute the golden-file expected value by hand for anything downstream of the changed
  figure - don't just accept whatever number the updated code now produces, since that's
  exactly the same failure mode a config bug would produce silently.
- Update the boundary tests for any threshold whose value moved.
- Run `npm run test:coverage` and confirm 100% coverage is still met - a changed branch
  condition (a threshold moving past a value some existing test used) can leave a line
  untested that used to be covered incidentally.

Day 3.5 is the worked example: the Medicare low-income threshold change (below) affected exactly
one existing test (`income-tax.test.ts`'s $30,000 shade-in case, since every other golden/
boundary test's income sat above both the old and new threshold) - both the Medicare levy and
net tax expected values were hand-recomputed and the recomputation itself written into the
test's comment, not left as a bare number.

## 4. Refresh `reviewDate` across affected content

Every article's frontmatter `reviewDate` fails validation once it's more than 12 months old
(`src/lib/content/schema.ts`'s `isReviewDateStale`), so this happens automatically over time
regardless - but a new financial year's config landing is also the moment to proactively bump
`reviewDate` on any article whose body cites a figure from the config that just changed (a
threshold, a rate, a cap mentioned in prose), even if its 12-month window hasn't lapsed yet. An
article can be schema-valid (recent `reviewDate`) while quietly describing a now-superseded
figure - the staleness check catches age, not correctness, so this step is a manual sweep, not
something `validate:content` does for you.

## 5. Two mandatory re-review triggers, not just 1 July

A new financial year's config is the obvious trigger, but waiting for it is not sufficient on
its own:

- **1 July** - the routine trigger. Most indexed figures (concessional caps, HELP/STSL bands,
  Medicare thresholds under ordinary indexation) change here, and this is when a genuinely new
  `TaxYearConfig` file is warranted per the procedure above.
- **May Budget night** - a Federal Budget measure can change a **current, already-in-progress**
  financial year's figures retroactively, not just next year's. This is not a hypothetical:
  the FY2025-26 Medicare low-income thresholds in this project's own config were revised via a
  **2.9% retroactive uplift from the 2026-27 Budget (Budget Paper No. 2, 12 May 2026)** -
  applied back to 1 July 2025, months into the financial year the original Human Gate 1 config
  had already been reviewed against. A config file signed off at Gate 1 in good faith needed a
  correction mid-year for a reason that had nothing to do with 1 July indexation at all. Treat
  every May Budget as a trigger to re-check every `SourcedValue` for the **current** financial
  year, not only figures being prepared for the next one.

Both triggers apply to the current file in place (step 1's "new file" procedure is for 1 July
only) - a Budget-night correction to the current year edits the existing year's file directly,
the same way Day 3.5 corrected `fy2025-26.ts` itself rather than creating a new file for a
mid-year change.
