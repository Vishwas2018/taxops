# TaxOps Design System

Adapted from the FamilyFlux design theme (source verbatim at
[design-theme-source.md](./design-theme-source.md)). Light mode only for v1 — see
[Divergences](#divergences-from-familyflux) for what was deferred and why.

Token architecture: every color is a CSS custom property holding **space-separated RGB
channels** (`--accent: 79 70 229;`), wired into Tailwind v4's `@theme` block as plain
`rgb(var(--accent))`. Opacity modifiers (`bg-accent/60`) work automatically — Tailwind v4
generates `color-mix()`-based CSS for any plain color value, no extra syntax needed. Components
use semantic class names only (`bg-surface`, `text-textPrimary`) — raw hex lives exclusively
in `src/app/globals.css`.

**Tailwind v3→v4 divergence, found and fixed Day 9**: this block originally read
`rgb(var(--accent) / <alpha-value>)` — a Tailwind v3 convention where the `<alpha-value>`
placeholder is substituted by v3's plugin engine at build time. Tailwind v4 (this project's
actual version since Day 1) has no such substitution step, so every `--color-*` variable
computed as the literal, invalid string `"rgb(79 70 229 / <alpha-value>)"`, which the browser
silently drops — every themed color in the app rendered as nothing (transparent/inherited) from
the Day 6.5 reskin until Day 9's first real screenshots caught it. See PROGRESS.md Day 9 for the
full writeup. If porting *other* pieces of the FamilyFlux source doc (`design-theme-source.md`)
that show the `<alpha-value>` pattern, drop the placeholder the same way.

## Non-negotiable rules

1. Every token change carries an inline contrast note (ratio + against what), or explicit
   "decorative, N/A".
2. No inline `style={}` — dynamic user colors go through a single Swatch pattern:
   `style={{ '--swatch-color': hex }}` + static `bg-[var(--swatch-color)]` class.
3. Semantic names only in components; raw hex lives exclusively in the token files.
4. Dark mode is a *derivation* against the navy anchor, not an inversion — re-verify every
   pair.
5. Color never the sole signifier (WCAG 1.4.1): pair with icon, text, or position.

## Color palette — light mode (implemented)

| Token | Hex | Role / contrast note |
|---|---|---|
| bg | `#F8F9FB` | App background, cool off-white |
| surface / surfaceElevated / surfaceHero | `#FFFFFF` | Cards, dialogs |
| textPrimary | `#111827` | ~19.7:1 on bg |
| textSecondary | `#4B5563` | ~8.0:1 on bg |
| textMuted | `#6B7280` | 4.59:1 on bg ✓ |
| border | `#E5E7EB` | Hairlines |
| **accent** | `#4F46E5` indigo-600 | Brand. White-on 6.29:1 ✓ |
| accentFg | `#FFFFFF` | Text on accent fills |
| accentOnSurface | `#3730A3` indigo-800 | Accent text on light bgs, 9.43:1 ✓. Also the global focus-ring color. |
| accentSubtle | `#EEF2FF` indigo-50 | Tinted chips/backgrounds |
| **secondary** | `#C2410C` orange-700 | **Reassigned in TaxOps** — property-figure highlighting, not growth/near-limit warnings. See Divergences. White-on 5.18:1 ✓ |
| secondaryOnSurface / secondarySubtle | `#C2410C` / `#FFF7ED` | |
| success / subtle | `#15803D` green-700 / `#F0FDF4` | White-on 5.01:1 ✓ |
| warning / subtle | `#B45309` amber-700 / `#FFFBEB` | White-on 5.02:1 ✓. Owns all caution/near-limit semantics in TaxOps. |
| danger / subtle | `#B91C1C` red-700 / `#FEF2F2` | White-on 6.47:1 ✓ |
| neutral / subtle | `#4B5563` / `#F3F4F6` | |
| chart 1–6 | `#4F46E5` `#C2410C` `#0D9488` `#7C3AED` `#059669` `#E11D48` | indigo/orange/teal/violet/emerald/rose, 600–700 tier |

Text-on-subtle pairs not given an explicit ratio in the source (`success`-on-`successSubtle`,
`warning`-on-`warningSubtle`, `danger`-on-`dangerSubtle`, `neutral`-on-`neutralSubtle`) follow
the Tailwind 700-on-50 convention used elsewhere in the palette and are visually high-contrast,
but were **not independently contrast-verified** — flag for a follow-up audit before relying on
them for anything beyond decorative pill backgrounds.

## Color palette — dark mode (specified, not implemented)

Not wired into the CSS. Kept here so a future dark-mode pass has a verified source of truth to
implement against, without re-deriving it from scratch.

| Token | Hex | Note |
|---|---|---|
| bg | `#0B1020` | Navy-charcoal anchor |
| surface | `#1A2744` | Navy ladder: each step ≥1.15:1 above previous |
| surfaceElevated | `#212E54` | |
| surfaceHero | `#0A0E1C` | Deepest — heroes go darker, not lighter |
| textPrimary | `#F8FAFC` slate-50 | 18.2:1 ✓ |
| textSecondary | `#CBD5E1` slate-300 | |
| textMuted | `#94A3B8` slate-400 | 5.78:1 on surface ✓ |
| border | `#2A3252` | Shadows are `none` in dark — borders do surface separation |
| accent | `#4F46E5` (unchanged) | indigo-500 was borderline AA — kept 600 |
| accentOnSurface | `#A5B4FC` indigo-300 | 9.50:1 ✓ |
| accentSubtle | `#1E1B4B` indigo-950 | |
| secondary / OnSurface / Subtle | `#9A3412` / `#FDBA74` / `#451A03` | ⚠ never put `secondary` text on `secondarySubtle` (2.05:1) — use OnSurface |
| success / fg / subtle | `#22C55E` / `#052E16` / `#052E16` | Dark inverts fg: dark-950 text on bright-500 fill |
| warning / fg / subtle | `#F59E0B` / `#451A03` / `#451A03` | |
| danger / fg / subtle | `#F87171` / `#450A0A` / `#450A0A` | |
| neutral / fg / subtle | `#94A3B8` / `#0F172A` / `#1E293B` | |
| chart 1–6 | `#818CF8` `#FB923C` `#2DD4BF` `#A78BFA` `#34D399` `#FB7185` | 400 tier — luminous on navy, all ≥4.5:1 on bg |

Glass/glow system, gradients, and the dark-specific fill-flip rules are documented in the
source file and apply only once dark mode is actually built.

## Typography

Inter Variable, `next/font/google` (see Divergences). `tabular-nums` on every money/figure
display. Scale: `display` 48px/1.05/−0.02em (hero numbers) · `h1` 32px · `h2` 24px · `h3` 20px ·
`body` 16px (Tailwind `text-base`) · `bodySmall` 14px (`text-sm`) · `caption` 12px (`text-xs`).

## Spacing, radii, shadows

- Spacing: Tailwind's default 4px-based scale already matches the source (4, 8, 12, 16, 24, 32…).
- Radii: `sm` 6px (inputs, badges) · `md` 10px (buttons, selects) · `lg` 16px (cards, dialogs) ·
  `xl` 24px (hero cards) · `full` (pills, avatars).
- Shadows (light only, slate-tinted): `shadow-subtle`, `shadow-raised`, `shadow-popover`,
  `shadow-floating` — Tailwind utilities generated directly from `--shadow-*` theme keys in
  `globals.css`.

## Component patterns

- **Button** (`src/components/ui/button.tsx`): `default`→primary (`bg-accent`), `secondary`/
  `outline`→bordered neutral (`bg-surface`/`bg-transparent` + `border-border`), `ghost`→
  transparent, `destructive`→danger (`bg-danger text-dangerFg`), `link`→accent text. Hover/active
  are alpha steps (`/90`, `/80`) of the same color, not new colors.
- **Card** (`src/components/ui/card.tsx`): base `rounded-lg border border-border bg-surface`;
  `variant="elevated"` adds `shadow-raised`; `variant="interactive"` adds hover lift + `tabIndex=0`.
- **Pill / Badge** (`src/components/ui/badge.tsx`): `rounded-full`, subtle-bg + OnSurface-text
  pairs (`bg-accentSubtle text-accentOnSurface`, etc.).
- **Focus ring (global)**: `*:focus-visible { outline: 2px solid accentOnSurface; outline-offset:
  2px; }` in `globals.css` — replaces the old per-component `ring-*` focus styling. Base UI
  internals that intentionally suppress the browser default outline (menu/select items, dialog
  content) keep their own bg-highlight focus treatment; that's an established listbox/menu
  pattern, not a gap. **Deliberately unlayered** (not inside `@layer base`) - Tailwind's cascade
  layer order (`theme < base < components < utilities`) meant a `@layer base` version of this
  rule silently lost to any component's own Tailwind utility classes in the `utilities` layer
  (e.g. Button's `outline-none`, which has no focus-visible override of its own), leaving every
  button with no visible keyboard focus indicator at all. Found by Day 9's real-browser
  keyboard-only E2E test reading computed `outline` styles - a CSS cascade-layer bug no
  jsdom/RTL unit test could reproduce.

## Divergences from FamilyFlux

- **Dark mode deferred.** TaxOps ships light-only for v1 — no toggle, no dark token values in
  CSS. The architecture is ready cheaply: `@custom-variant dark` targets `[data-theme="dark"]`
  (not FamilyFlux's `.dark` class), so a future dark pass only has to add token values and a
  toggle, not rewire selectors. Reason: zero v1 requirement, and shipping it means re-testing
  every surface pair plus the glass/glow system — real scope with no near-term payoff.
- **Glass/glow system deferred with dark mode** — it's dark-mode-only in the source and has no
  light-mode equivalent worth building alone.
- **`secondary` (orange-700) reassigned.** Source role was "growth metrics, near-limit
  warnings," which collides with TaxOps' existing `warning` (amber) semantic — two
  orange-adjacent signals in a tax app risks muddying "this is a caution" vs "this is a
  highlight." TaxOps uses `secondary` for property-related figure highlighting only (distinct
  from `accent`, which is used for contractor-income figures); `warning` owns all caution/
  near-limit semantics exclusively. As of this pass `secondary`/`secondaryOnSurface`/
  `secondarySubtle` have no live consumer yet (Badge's `secondary` variant carries the styling,
  ready for the first property-calculator UI that needs it) — the FY badge on tip articles was
  moved off `secondary` to `outline` since a financial-year tag isn't a property figure.
- **Font: `next/font/google` Inter, not `next/font/local` self-hosted woff2.** No font binary
  exists in the repo and adding one is out of scope for a token/re-skin task under "no new
  dependencies." `next/font/google` already downloads and self-hosts the font files at build
  time (confirmed by the existing Geist setup it replaced) — no runtime request to Google — so
  the property the source cares about (preload + fallback-metrics, no render-blocking external
  request) is preserved even though the mechanism differs.
- **Motion/data-state attributes: no translation needed.** The source references "Radix
  `data-state` enter/exit animations," but this shadcn version runs on `@base-ui/react`, whose
  primitives already emit `data-open`/`data-closed`/`data-popup-open` (confirmed in
  `dialog.tsx`, `dropdown-menu.tsx`) and `tw-animate-css`'s `data-open:animate-in` selectors
  already target those attributes. Nothing to change here — flagged in case a future primitive
  is hand-rolled against the wrong attribute set.
- **Text-on-subtle contrast for success/warning/danger/neutral pills** — not independently
  verified, see the palette table note above.
