# FamilyFlux Design Theme — Portable Reference

Extracted from FamilyFlux (post UI-UPLIFT Arc 0, "fintech glass" direction). Everything here is framework-portable: the palette and rules work in any Tailwind/CSS-variable project.

## Design philosophy

Dark-first fintech glass. Light mode is a crisp, opaque, cool-gray workspace; dark mode is a deep navy environment with translucent glass surfaces, accent glow, and luminous charts. Trust signals everywhere: AA contrast verified per token pair, color never the sole signifier, focus rings always visible.

## Architecture pattern (the part that makes it portable)

Colors are CSS custom properties holding **space-separated RGB channels**, wired into Tailwind so opacity modifiers work:

```css
:root { --color-accent: 79 70 229; }            /* channels, no commas */
[data-theme="dark"] { --color-accent: 79 70 229; }
```

```ts
// tailwind.config.ts
colors: { accent: 'rgb(var(--color-accent) / <alpha-value>)' }  // → bg-accent/60 works
```

Dark mode: `darkMode: ['selector', '[data-theme="dark"]']`, toggled by setting `data-theme="dark"` on `<html>`. Components only ever use semantic class names (`bg-surface`, `text-textPrimary`) — theming is 100% token-level.

## Color palette — light mode

| Token | Hex | Role / contrast note |
|---|---|---|
| bg | `#F8F9FB` | App background, cool off-white |
| surface / surfaceElevated / surfaceHero | `#FFFFFF` | Cards, dialogs (differentiated by shadow, not color) |
| textPrimary | `#111827` | ~19.7:1 on bg |
| textSecondary | `#4B5563` | ~8.0:1 on bg |
| textMuted | `#6B7280` | 4.59:1 on bg ✓ |
| border | `#E5E7EB` | Hairlines |
| **accent** | `#4F46E5` indigo-600 | Brand. White-on 6.29:1 ✓ |
| accentFg | `#FFFFFF` | Text on accent fills |
| accentOnSurface | `#3730A3` indigo-800 | Accent-colored *text* on light bgs, 9.43:1 ✓ |
| accentSubtle | `#EEF2FF` indigo-50 | Tinted chips/backgrounds |
| **secondary** | `#C2410C` orange-700 | Growth metrics, near-limit warnings. White-on 5.18:1 ✓ |
| secondaryOnSurface / secondarySubtle | `#C2410C` / `#FFF7ED` | |
| success / subtle | `#15803D` green-700 / `#F0FDF4` | White-on 5.01:1 ✓ |
| warning / subtle | `#B45309` amber-700 / `#FFFBEB` | White-on 5.02:1 ✓ |
| danger / subtle | `#B91C1C` red-700 / `#FEF2F2` | White-on 6.47:1 ✓ |
| neutral / subtle | `#4B5563` / `#F3F4F6` | |
| chart 1–6 | `#4F46E5` `#C2410C` `#0D9488` `#7C3AED` `#059669` `#E11D48` | indigo/orange/teal/violet/emerald/rose, 600–700 tier |

Key derivation rule: semantic colors step **one shade darker than Tailwind 600** wherever white-on or text-on-subtle fails 4.5:1.

## Color palette — dark mode

Derived against `#0B1020` navy, not neutral gray-950 — this is what gives the "high-tech" cast.

| Token | Hex | Note |
|---|---|---|
| bg | `#0B1020` | Navy-charcoal anchor |
| surface | `#1A2744` | Navy ladder: each step ≥1.15:1 above previous |
| surfaceElevated | `#212E54` | |
| surfaceHero | `#0A0E1C` | Deepest — heroes go *darker*, not lighter |
| textPrimary | `#F8FAFC` slate-50 | 18.2:1 ✓ |
| textSecondary | `#CBD5E1` slate-300 | |
| textMuted | `#94A3B8` slate-400 | 5.78:1 on surface ✓ |
| border | `#2A3252` | Shadows are `none` in dark — borders do surface separation ("flat-on-tinted") |
| accent | `#4F46E5` (unchanged) | indigo-500 was borderline AA — kept 600 |
| accentOnSurface | `#A5B4FC` indigo-300 | Accent *text* in dark, 9.50:1 ✓ |
| accentSubtle | `#1E1B4B` indigo-950 | |
| secondary / OnSurface / Subtle | `#9A3412` / `#FDBA74` / `#451A03` | ⚠ never put `secondary` text on `secondarySubtle` (2.05:1) — use OnSurface |
| success / fg / subtle | `#22C55E` / `#052E16` / `#052E16` | Dark inverts fg: dark-950 text on bright-500 fill |
| warning / fg / subtle | `#F59E0B` / `#451A03` / `#451A03` | |
| danger / fg / subtle | `#F87171` / `#450A0A` / `#450A0A` | |
| neutral / fg / subtle | `#94A3B8` / `#0F172A` / `#1E293B` | |
| chart 1–6 | `#818CF8` `#FB923C` `#2DD4BF` `#A78BFA` `#34D399` `#FB7185` | Same hues at **400 tier** — luminous on navy, all ≥4.5:1 on bg |

Two transferable dark-mode rules: (1) semantic fills flip to bright-400/500 with near-black *-fg text instead of white; (2) charts lighten from 600 → 400 tier.

## Glass & glow system (dark mode only)

| Token | Value |
|---|---|
| Glass card | `rgb(surface / 0.6)` + `backdrop-blur` ≤ 12px + `border-white/10` edge highlight |
| Glass nav | `rgb(surface / 0.7)` + blur ≤ 16px |
| Budget | ≤ 6 glass surfaces per viewport (perf) |
| glow-sm | `0 0 8px accent/0.25` |
| glow-md | `0 0 20px accent/0.35, 0 4px 12px accent/0.2` |
| glow-lg | `0 0 40px accent/0.45, 0 8px 24px accent/0.25` |
| chart glow | `0 0 12px chartN/0.35` on active/hovered segments |

Light mode: **no glass** (opaque surfaces + slate-tinted shadows), glow at exactly half alpha, restricted to accent elements only (primary button, hero card, active nav indicator). Glow is decorative — never a state's only indicator.

## Gradients

```css
/* light */ --gradient-accent: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
/* dark  */ --gradient-accent: linear-gradient(135deg, #A5B4FC 0%, #A78BFA 100%);
--gradient-hero: radial-gradient(circle at top right, rgb(accent / 0.08–0.18), transparent 60%);
```

⚠ Learned the hard way: in dark mode the gradient uses indigo-300→violet-400 because raw indigo-600 fails as text on near-black; and the dark gradient must **never** carry white button text (2.72:1 on the violet end). Dark mode: gradient-*text* only (hero numbers via `background-clip: text`). Light mode: safe as button fill.

## Typography

- **Font:** Inter Variable (self-hosted woff2, `font-display: optional`), system-ui stack fallback. Money/figures get `tabular-nums`.
- **Scale:** display 48px/1.05/700/−0.02em (hero numbers) · h1 32px/700 · h2 24px/600 · h3 20px/600 · body 16px · bodySmall 14px · caption 12px

## Spacing, radii, shadows

- **Spacing:** 4px base — 4, 8, 12, 16, 24, 32, 48, 64
- **Radii:** sm 6px (inputs, badges) · md 10px (buttons, selects) · lg 16px (cards, dialogs) · xl 24px (hero cards) · full (pills, avatars)
- **Shadows (light only, slate-tinted `rgba(15,23,42,…)`):**
  - subtle `0 2px 8px .07, 0 1px 3px .04`
  - raised `0 6px 20px .10, 0 2px 6px .06`
  - popover `0 20px 48px .13, 0 6px 14px .08`
  - floating `0 16px 40px .13, 0 4px 12px .08`

## Component patterns

**Button** — base: `inline-flex items-center justify-center font-medium border transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none`

| Variant | Classes |
|---|---|
| primary | `bg-accent text-accentFg hover:bg-accent/90 active:bg-accent/80 border-transparent` |
| secondary | `bg-surface text-textPrimary border-border hover:bg-neutralSubtle active:bg-border` |
| ghost | `bg-transparent border-transparent hover:bg-neutralSubtle active:bg-border` |
| danger | `bg-danger text-dangerFg hover:bg-danger/90 active:bg-danger/80` |

Sizes: sm `px-3 py-1 text-sm` · md `px-4 py-2 text-sm` · lg `px-6 py-3 text-base` — all `rounded-md`. Loading state = spinner + `aria-busy` + disabled. Hover/active states are alpha steps of the same color (90/80), not new colors.

**Card** — `rounded-xl p-6 bg-surface border border-border`; elevated adds `shadow-raised`; interactive adds `cursor-pointer hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200` + `tabIndex=0` + focus ring.

**Pill** — `rounded-full font-medium`, subtle-bg + OnSurface-text pairs (`bg-accentSubtle text-accentOnSurface`, etc.). Rule: color is never the sole signifier — always icon or text alongside.

**Focus ring (global):** `outline: 2px solid accentOnSurface; outline-offset: 2px` — accentOnSurface guarantees visibility on every surface level in both modes.

## Motion

- Standard transition: `duration-200 ease-in-out` on every `transition-*`.
- Micro-interactions: card hover lift (`-translate-y-0.5`), alpha-step button states, Radix `data-state` enter/exit animations (tailwindcss-animate class conventions, hand-rolled keyframes — no plugin dependency).
- Nav-indicator glow-pulse is the only infinite animation; CTAs never pulse.
- Global reduced-motion kill-switch: `@media (prefers-reduced-motion: reduce)` forces all animation/transition durations to 0.01ms; infinite animations (shimmer, glow-pulse) need explicit static-state overrides so they don't freeze mid-frame.

## Non-negotiable rules that make the theme hold together

1. Every token change carries an inline contrast note (ratio + against what), or explicit "decorative, N/A".
2. No inline `style={}` — dynamic user colors go through a single Swatch pattern: `style={{ '--swatch-color': hex }}` + static `bg-[var(--swatch-color)]` class.
3. Semantic names only in components; raw hex lives exclusively in the token files.
4. Dark mode is a *derivation* against the navy anchor, not an inversion — re-verify every pair.
5. Color never the sole signifier (WCAG 1.4.1): pair with icon, text, or position.
