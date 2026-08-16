# Qarote Design System

The canonical source of truth is **`apps/app/src/styles/index.css`**. This document
explains the decisions, tradeoffs and anti-patterns behind those tokens so a new
contributor (or a Claude Code agent) understands the _why_, not just the _what_.

When you change a token in `index.css`, update this document in the same PR.

---

## Voice & Tone

Calm under stress. Qarote users are devs/CTOs in incident mode (production
RabbitMQ misbehaving) — not marketers reading copy. Every word and pixel should
**reduce cognitive load**, not add personality for personality's sake.

- **Show data first, opinion second.** State the broker fact, then the
  interpretation. Never the reverse.
- **No exclamation marks** in product UI. Exception: small delight moments
  in the rabbit animations and the wordmark.
- **Errors apologize without grovelling.** "Couldn't reach the broker. Retry?"
  beats "Oh no, something went terribly wrong!"
- **One job per surface.** A page asks the user to do (or read) one thing.

---

## Typography

Three faces, each with a strict job. All three are **self-hosted via
`@fontsource`** (imported in `apps/app/src/main.tsx`, `apps/portal/src/main.tsx`,
and `apps/web/src/layouts/BaseLayout.astro`), weights 400–700 — zero external
request.

| Token                                    | Face              | Job                                                                                                               |
| ---------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `--font-heading` (web: `--font-display`) | **Space Grotesk** | H1 page titles, H2 section headers. No optical-size axis; `.title-*` keep `font-optical-sizing: auto` harmlessly. |
| `--font-sans`                            | **IBM Plex Sans** | All body and UI text. System stack stays as the fallback while it loads.                                          |
| `--font-mono`                            | **IBM Plex Mono** | Metric numbers, queue depths, rates, IDs, routing keys, code.                                                     |

Utilities:

- `.title-page` → 3xl bold tracking-tight, Space Grotesk
- `.title-section` → xl semibold tracking-tight, Space Grotesk
- `.title-gradient` → carrot→red gradient, **wordmark only**

---

## Color

### Brand

| Token                  | Light             | Dark              | Use                                                                                                                                                               |
| ---------------------- | ----------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--primary`            | `hsl(21 90% 48%)` | `hsl(21 90% 52%)` | All CTAs, links, focus rings, sidebar highlight. **Carrot** `#E8590C` — the brand constant, same hue in both themes (dark is +4 lightness for contrast on night). |
| `--primary-foreground` | `hsl(0 0% 100%)`  | `hsl(0 0% 100%)`  | White text on carrot surfaces (carrot needs white — dark text fails contrast).                                                                                    |

Contrast: carrot on white ≈ 3.6:1 — passes AA for **large text and UI
components** (3:1 bar: buttons, focus rings, icons, badges) but **not** for
normal body text (4.5:1). Never use carrot as a text color on a white/paper
surface; use `--foreground` for text and reserve carrot for fills, borders,
and chrome. White-on-carrot (button labels) is the same ≈3.6:1 — fine for the
bold/large label sizes used on CTAs.

### Neutrals

Light is **warm paper**; dark is **cool deep-navy night**. Two deliberately
different temperatures — the night palette is the prototype's signature.

| Token                 | Light                                  | Dark                         | Use                                                                              |
| --------------------- | -------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `--background`        | `40 27% 98%` paper `#FBFAF8`           | `220 29% 6%` night `#0B0E14` | Page surface. Light is warm off-white (not pure white); dark is near-black navy. |
| `--foreground`        | `34 20% 7%`                            | `220 23% 92%`                | Body text. Night fg/bg ≈ 14:1.                                                   |
| `--card`              | `0 0% 100%` pure white                 | `221 28% 9%` navy surface    | Cards are pure white on warm paper (elevation reads); a navy surface on night.   |
| `--muted`, `--accent` | warm `#EEEBE3` / carrot wash `#FBEEE4` | navy `#161B26` / carrot-soft | `--accent` carries the brand as a selected/hover tint.                           |
| `--border`, `--input` | `#E3DFD6` / `#D4CFC4`                  | `#222836` / `#2C3444`        | Form chrome.                                                                     |

### Semantic status

**Use ONLY for actual health/state. Never decorative.** Hue spread is intentional
to remain distinguishable when desaturated (color-blindness safety).

| Token           | Light              | Dark               | Job                                                               |
| --------------- | ------------------ | ------------------ | ----------------------------------------------------------------- |
| `--success`     | `hsl(146 50% 36%)` | `hsl(150 50% 50%)` | Resolved finding, healthy broker, action completed.               |
| `--warning`     | `hsl(35 75% 49%)`  | `hsl(40 73% 56%)`  | Amber alert — deliberately distinct from primary carrot (hue 21). |
| `--info`        | `hsl(217 71% 51%)` | `hsl(217 75% 64%)` | Neutral context, "you should know" callouts.                      |
| `--destructive` | `hsl(6 68% 52%)`   | `hsl(7 84% 64%)`   | Critical findings, destructive actions.                           |

Each has a paired `-muted` token for soft backgrounds (e.g. `--success-muted` for
a calm green card). In dark mode, status `-foreground` is the night background
(`220 29% 6%`) so bright status fills carry dark text.

### Charts

15 series defined as `--chart-*` tokens. Palette = Tableau 10 + 5 OKLCH-derived
extensions. Color-blind audited (see `apps/app/src/lib/chartColors.ts` for the
provenance). Dark mode = same hues, lifted ~13% in lightness. **The chart palette
is unchanged by the design pivot** — it stands independent of the brand swap.

---

## Spacing & Layout

- **Tailwind defaults** for spacing scale. No custom scale.
- **Border radius small.** `--radius: 0.4375rem` (7px). Softer than the old 4px
  but still tool-like — not bubbly. Don't override locally to large radii.
- **Page max-width.** `.content-container` = `max-w-6xl`, `.content-container-large`
  = `max-w-7xl`, container utility caps at `1400px`.
- **Padding rhythm.** Main content = `p-6` desktop, `p-4` mobile-ish via
  `.main-content-scrollable`.
- **Cards** use `.card-unified` (`bg-card border rounded-lg p-6 shadow-xs`) —
  consistent across the app. Compact variant for dense lists.

---

## Motion

### Policy

- **Restraint is the default.** Most surfaces have zero animation.
- **Loading states get care.** See `ScanLogStream` for the progressive
  checklist pattern (reuse this for Diagnosis loading per design doc T2).
- **Respect `prefers-reduced-motion`.** `animate-spin` is globally swapped
  to `gentle-pulse` (opacity fade) for users with the OS preference — WCAG 2.3.3
  vestibular safety. Implemented globally in `index.css`.

### Brand animation set (rabbit theme)

Qarote's wordmark mascot is a pixel-art rabbit. The following animations live
in `@theme` and are reserved for delight moments around the mascot — never as
decoration on UI chrome.

| Animation                              | Trigger / Use                           |
| -------------------------------------- | --------------------------------------- |
| `rabbit-bounce`                        | Hero / empty-state celebration.         |
| `rabbit-bob`                           | Idle ambient motion.                    |
| `ear-twitch-left` / `ear-twitch-right` | Subtle aliveness.                       |
| `blink` / `blink-delayed`              | Subtle aliveness, staggered.            |
| `nose-wiggle`                          | Subtle aliveness.                       |
| `broom-swish`                          | Action moment (e.g. "cleanup done").    |
| `dust-fade`                            | Paired with broom-swish.                |
| `badge-pop`                            | Achievement / streak / count-up reveal. |

**Why this matters for differentiation:** these animations are Qarote's
proprietary visual signature. They are the antidote to generic AI-slop motion
(decorative blobs, wavy SVG dividers, floating gradients). When a competitor
ships a similar feature, the rabbit set is what users remember.

### Animation utilities outside the rabbit set

- `accordion-down` / `accordion-up` — Radix Collapsible content height.
- `gentle-pulse` — reduced-motion swap for spinners.

No other ambient/decorative animations exist. Don't add any.

---

## Components

**Library**: shadcn/Radix only. The full primitives library is wired
(`apps/app/src/components/ui/`).

**No alternative design system.** Don't pull in Material UI, Ant Design,
HeroUI, or hand-roll a parallel component library. If shadcn doesn't have it,
extend shadcn (most components are extension-friendly).

**Custom utilities** to use over raw Tailwind for common patterns:

- `.btn-primary` / `.btn-primary-large` — solid carrot CTA, no gradient.
  Hover = `hsl(var(--primary) / 92%)`. Disabled = muted background.
- `.title-page`, `.title-section` — Space Grotesk heading typography.
- `.card-unified` / `.card-unified-compact` — standard card surface.
- `.content-container` / `.content-container-large` — page width wrapper.
- `.page-layout` — full-height flex column for app pages.
- `.main-content` / `.main-content-scrollable` — scrolling body of a page.

---

## Anti-patterns (don't do)

These are explicit "no" decisions made and committed. If you find yourself
reaching for one of these, stop and check `index.css` or this doc for the
sanctioned alternative.

1. **Decorative gradients.** Removed via the `/quieter` sweep. Solid
   `bg-primary` for buttons, `bg-background` for surfaces. The carrot→red
   gradient survives **only** inside `.title-gradient` for the wordmark.
2. **Purple / violet / indigo accents.** Not in Qarote's palette. Carrot
   (orange `#E8590C`) is the brand color.
3. **3-column AI-slop feature grid.** Icon-in-colored-circle + bold title
   - 2-line description, repeated 3x symmetrically. See landing page
     "How it works" — use one strong composition (animated demo, interactive
     walkthrough) instead.
4. **Centered everything.** Don't put `text-align: center` on every heading
   and card. Use deliberate alignment based on content type.
5. **Bubbly border radius.** `--radius` is small (7px). Don't override locally
   to large unless there's a strong reason (e.g. avatar circles).
6. **Default font stacks (Inter, Roboto, Arial, raw system-ui).** Headings are
   Space Grotesk, body/UI is IBM Plex Sans, numerals are IBM Plex Mono — all
   self-hosted via `@fontsource`. The system stack is a _fallback only_; don't
   ship Inter or leave body text on bare system-ui to "save bytes".
7. **Emoji as decoration.** No rockets in headings, no emoji bullet points.
   Lucide icons or nothing.
8. **`animate-spin` without considering reduced-motion.** Already handled
   globally in `index.css`, but don't override the swap.
9. **Decorative blobs, wavy dividers, floating shapes.** If a section feels
   empty, it needs better content, not decoration.
10. **Status colors as decoration.** `--success`, `--warning`, `--info` are
    for actual state. Don't use `text-success` to highlight a marketing
    point.

---

## Source of truth

- **Canonical**: `apps/app/src/styles/index.css`
- **Chart palette provenance**: `apps/app/src/lib/chartColors.ts`
- **Animation prior-art context**: `apps/app/src/styles/index.css` comments

When adding or changing a token, update both this `DESIGN.md` and any review
that depends on the visual language (`/critique`, `/design-review`,
`/plan-design-review`).
