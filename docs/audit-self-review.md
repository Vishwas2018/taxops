# Self-audit: Day 11.9 screenshot review

Reviewed every screenshot in `e2e/screenshots/audit/` against `docs/design.md` (elevation
ladder, 4px spacing rhythm, type-scale hierarchy, `tabular-nums` on money/figures, disclaimer
prominence, empty-state styling). **Findings only - no fixes applied in this pass**, per this
task's own scope; this is input to Day 12, not Day 12 itself.

Severity key: **CRITICAL** (blocks real use), **HIGH** (visible/obvious, single clear root
cause), **MEDIUM** (real inconsistency, matter of judgment how to resolve), **LOW** (polish
opportunity, no rule technically broken).

## Cross-cutting findings (appear on multiple screens)

### [HIGH] Input fields render pill-shaped, not the spec'd 6px radius

`src/components/ui/input.tsx` uses `rounded-lg` (16px). `docs/design.md`'s radii table assigns
`sm` (6px) to inputs/badges, `lg` (16px) to cards/dialogs only. At the input's `h-8` (32px)
height, a 16px radius is exactly half the height, i.e. fully pill-shaped - visible on every
screen with a text field: `auth-sign-in.png`, `auth-sign-up.png`, all three
`calculator-*-filled.png`, `mobile-calculator-contractor-take-home.png`, and the "Add item"
fields in `checklists-default.png`/`checklists-with-toggle-and-custom-item.png`. Buttons
(`rounded-md`) and cards (`rounded-lg`) both correctly match the doc elsewhere - this looks like
an isolated copy-paste of the wrong token onto one component, not a spreading pattern. Single-
file fix would correct every instance at once.

### [MEDIUM] Elevation ladder isn't applied consistently across primary surfaces

`docs/design.md`'s `Card` component supports `variant="elevated"` (adds `shadow-raised`), but
nothing in the app currently uses it - every `<Card>` in the codebase is the plain
`border + bg-surface` base variant. That's internally consistent within any single screen, but
creates a flat look on the screens most likely to want visual hierarchy:

- `dashboard.png` / `mobile-dashboard.png`: the "Tax profile" and "EOFY checklist" summary cards
  and the three calculator cards sit directly on `bg` with only a hairline `border-border`
  separating them - no shadow at all on what's meant to be the app's home screen.
- `calculator-contractor-take-home-filled.png` (and the other two calculators): the results
  panel is wrapped in a `<Card>`, but the input form beside it has **no card/surface treatment
  at all** - on the same screen, one side reads as "styled panel," the other as "raw form
  fields." This is the clearest concrete instance of the inconsistency, not a subjective read.
- `wizard-step-1-empty.png` / `-with-selection.png` / `mobile-wizard-step-1.png`: the wizard's
  question content also has zero surface wrapper - floats directly on `bg`, unlike the
  dashboard/calculator cards it sits alongside in the same app shell.

Not a rule violation (base `Card` is a documented, valid variant) - flagged as a judgment call
for Day 12: either lean into "flat is the intentional look" everywhere, or apply
`variant="elevated"` (or at minimum a matching surface wrapper) to the form/wizard surfaces that
currently have none, so elevation means the same thing on every screen.

### [LOW] Percent figures aren't wrapped in `tabular-nums`

`docs/design.md`: "`tabular-nums` on every money/figure display." Grepped every currency
renderer (`formatCurrency` in the three calculator results components) - all three correctly
apply `tabular-nums` at the `<dl>` level, confirmed in source, not just by eye. The gap is
percent figures specifically: `dashboard.png`'s two progress cards
(`src/app/(app)/dashboard/page.tsx:67,93`) and `checklists-default.png`'s progress line
(`src/components/checklists/checklists-client.tsx:65`) render `{percent}%` with no
`tabular-nums` class anywhere in the ancestor tree. Low practical visual impact today (each is a
single standalone percent, not a column of them needing digit alignment), but it's a literal,
verifiable gap against the stated rule, not a judgment call.

## Screen-by-screen

### `marketing-home.png`

- [LOW] The inline "Educational only - not lodgement..." line sits directly above the boxed
  footer `Disclaimer`, saying a very similar thing twice in a row with different wording.
  Disclaimer *prominence* is fine (arguably over-served here); worth a look at Day 12 for
  whether both are earning their place, not a compliance problem either way.
- No elevation used anywhere on this page (feature cards are base `Card`) - internally
  consistent, flagged only for cross-reference with the dashboard finding above.

### `auth-sign-in.png` / `auth-sign-up.png`

- [HIGH] Pill-shaped inputs (see cross-cutting finding).
- Type hierarchy, spacing, and card elevation (this one **is** a bordered white card on `bg`,
  no shadow) read as intentional and consistent between the two screens - no other finding.

### `dashboard.png` / `mobile-dashboard.png`

- [MEDIUM] Flat card treatment (see cross-cutting finding) - the screen a returning user sees
  most often has no visual hierarchy beyond hairline borders.
- [LOW] Percent figures missing `tabular-nums` (see cross-cutting finding).
- [CRITICAL - mobile only] See "Mobile navigation" below - applies to every mobile screen, not
  dashboard specifically, called out once there in detail.

### `wizard-step-1-empty.png` / `wizard-step-1-with-selection.png` / `mobile-wizard-step-1.png`

- [MEDIUM] No surface wrapper around the question content (see cross-cutting finding).
- [LOW] Noticeable empty space below the Back/Next buttons on desktop - sparse, not wrong.
- Radio selection state (`-with-selection.png`) is clear: filled accent-colored dot, good
  contrast against the unselected options. No finding here.

### `calculator-contractor-take-home-filled.png`, `calculator-div-293-filled.png`, `calculator-property-cash-flow-filled.png`

- [HIGH] Pill-shaped inputs (see cross-cutting finding) - every numeric field on all three
  pages.
- [MEDIUM] Card-only-on-one-side asymmetry (see cross-cutting finding) - clearest on these three
  screens specifically, since form and results sit side by side in the same viewport.
- **Pass**: `tabular-nums` correctly present on every results `<dl>`, verified in source for all
  three components, not just visually.
- **Pass**: financial year is clearly displayed in every results panel header ("Estimated
  results — FY2025-26"), calculator disclaimer variant renders directly under the numbers it
  qualifies, "Assumptions used in this estimate" is present and collapsed by default (doesn't
  compete with the headline numbers).
- [LOW] `calculator-property-cash-flow-filled.png`'s negative pre-tax cash flow (`-$2,500`)
  renders in plain neutral text, no color treatment. Not a WCAG 1.4.1 violation (there's no
  color happening to be a *sole* signifier of anything - the `-` prefix is the only signal, and
  it's sufficient on its own), but a candidate for an intentional warning-tint treatment at Day
  12 if more visual distinction between negative/positive results is wanted.

### `tips-index.png`

- **Pass, confirmed two ways**: none of the 6 Day 11 `draft: true` articles appear - checked by
  an actual Playwright assertion (`expect(page.getByText(title)).toHaveCount(0)` for all 6
  titles) before the screenshot was taken, not just eyeballed after the fact. Only the 3
  pre-existing published articles show; "Wealth preservation" category heading is correctly
  absent (zero published articles in that category).
- [LOW] Plain text list, no card treatment per article - internally consistent with itself
  (nothing else on this page is elevated either), just noting for completeness alongside the
  elevation-ladder finding above.

### `tips-article.png`

- [HIGH - genuine bug, not a polish nit] **The disclaimer renders twice, back-to-back, with
  nothing between them.** `src/app/(marketing)/tips/[slug]/layout.tsx` renders its own
  `<Disclaimer variant="footer" />` specifically so an MDX article can't omit it - but this
  route is *also* nested inside `src/app/(marketing)/layout.tsx`, which renders its own
  identical footer `Disclaimer` for every marketing page. Both fire for `/tips/[slug]`
  specifically (the only route with both layouts stacked), producing two identical boxed
  disclaimers immediately adjacent to each other at the bottom of the page - visible clearly in
  the screenshot, reads as a rendering glitch rather than intentional emphasis. `/tips` (the
  index) shows only one, confirming this is specific to the nested article layout, not a
  site-wide duplication.
- **Pass**: FY badge (`FY2025-26`) and "Reviewed: [date]" render correctly as an outline-variant
  pill at the top, matching the documented pill/badge pattern.

### `checklists-default.png` / `checklists-with-toggle-and-custom-item.png`

- [HIGH] Pill-shaped "Add item" text inputs (see cross-cutting finding).
- **Pass**: group item-count pills (`0/9`, `1/8`, etc.) use the correct pill/badge treatment.
- **Pass**: checked-item state (blue check, filled) and the added custom item row (with
  Edit/Remove actions) are both clearly visible and legible in the toggled screenshot.
- [Noted, not investigated] A Next.js Dev Tools "1 Issue" indicator appeared during the
  toggle-and-add-custom-item interaction in `checklists-with-toggle-and-custom-item.png` (visible
  as a small red badge, bottom-left). This is a dev-only overlay, not part of the shipped app,
  and diagnosing it is outside this design-focused review's scope - flagging so it isn't lost
  rather than silently ignoring a visible warning signal.

## Mobile navigation (390px) - applies to all three mobile screenshots

- [**CRITICAL**] `mobile-dashboard.png`, `mobile-calculator-contractor-take-home.png`, and
  `mobile-wizard-step-1.png` all show **no navigation at all** below the sidebar's `md:block`
  breakpoint. `src/app/(app)/layout.tsx`'s sidebar is `hidden w-56 shrink-0 border-r md:block` -
  hidden entirely under 768px, and there is no mobile alternative anywhere in the codebase
  (confirmed by grepping `src/components/nav/` and the app layout for any hamburger/`Sheet`/
  `Drawer` pattern - none exists; `UserMenu` is an account dropdown, not section navigation).
  **At 390px, a signed-in user has no way to move between Dashboard / Tax Profile / Calculators
  / Checklists / Tips once they've navigated away from the dashboard**, other than the
  dashboard's own in-page links, the browser back button, or typing a URL directly. This is a
  functional gap, not a polish nit, and it's the single most severe finding in this review - it
  effectively blocks real mobile use of every app section except whichever one a link happened
  to be clicked into.

## What this doesn't cover

Accessibility/contrast regressions are covered by the existing `e2e/accessibility/axe-scans.spec.ts`
suite, not repeated here - this review is specifically about `docs/design.md` alignment
(elevation, spacing, type, `tabular-nums`, disclaimer, empty states), not a fresh a11y pass.
Empty states with genuinely no data (e.g., a brand-new user's dashboard before any checklist
item exists) weren't separately captured this round - the checklist/dashboard screens shown are
all "zero progress" states already, which cover most of that ground, but a literal empty-list
state (e.g., zero checklist groups visible) wasn't specifically staged.
