# Qarote Design System

The canonical source of truth is **`apps/app/src/styles/index.css`**. This document
explains the decisions, tradeoffs and anti-patterns behind those tokens so a new
contributor (or a Claude Code agent) understands the *why*, not just the *what*.

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

Three faces, each with a strict job:

| Token | Face | Job |
|---|---|---|
| `--font-heading` | **Bricolage Grotesque** variable (opsz 12-96) | H1 page titles, H2 section headers. Optical sizing on (`font-optical-sizing: auto`) — sharpens letterforms at display sizes, softens at small sizes. |
| `--font-sans` | **system-ui stack** (SF Pro / Segoe UI / Cantarell) | All body and UI text. Native first — zero web font request, respects the self-hosted ethos. |
| `--font-mono` | **Fragment Mono** (Google Fonts) | Metric numbers, queue depths, rates, IDs, routing keys, code. |

Utilities:
- `.title-page` → 3xl bold tracking-tight, Bricolage with opsz auto
- `.title-section` → xl semibold tracking-tight, Bricolage with opsz auto
- `.title-gradient` → orange→red gradient, **wordmark only**

---

## Color

### Brand

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `hsl(24 82% 52%)` | `hsl(24 82% 56%)` | All CTAs, links, focus rings, sidebar highlight. Brand orange — saturation deliberately dialed from 95% → 82% for sophistication ("less neon"). |
| `--primary-foreground` | `hsl(0 0% 98%)` | `hsl(0 0% 98%)` | Text on primary surfaces. |

### Neutrals (warm)

| Token | Use |
|---|---|
| `--background` | Page surface. |
| `--foreground` | Body text. |
| `--card` | Card surface — warm tint (`30 25%` hue) so cards lift gently from the page without a heavy shadow. |
| `--muted`, `--accent` | Quiet secondary surfaces (warm beige). |
| `--border`, `--input` | Form chrome — same warm hue family. |

### Semantic status

**Use ONLY for actual health/state. Never decorative.** Hue spread is intentional
to remain distinguishable when desaturated (color-blindness safety).

| Token | Light | Dark | Job |
|---|---|---|---|
| `--success` | `hsl(142 71% 28%)` | `hsl(142 60% 50%)` | Resolved finding, healthy broker, action completed. |
| `--warning` | `hsl(38 92% 45%)` | `hsl(38 90% 56%)` | Amber alert — deliberately distinct from primary orange (hue 24). |
| `--info` | `hsl(217 91% 50%)` | `hsl(217 88% 62%)` | Neutral context, "you should know" callouts. |
| `--destructive` | `hsl(0 72% 47%)` | `hsl(0 72% 56%)` | Critical findings, destructive actions. |

Each has a paired `-muted` token for soft backgrounds (e.g. `--success-muted` for
a calm green card).

### Charts

15 series defined as `--chart-*` tokens. Palette = Tableau 10 + 5 OKLCH-derived
extensions. Color-blind audited (see `apps/app/src/lib/chartColors.ts` for the
provenance). Dark mode = same hues, lifted ~13% in lightness.

---

## Spacing & Layout

- **Tailwind defaults** for spacing scale. No custom scale.
- **Border radius small.** `--radius: 0.25rem` (~4px). Tight, dev-tool feel.
  No bubbly large radii.
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

| Animation | Trigger / Use |
|---|---|
| `rabbit-bounce` | Hero / empty-state celebration. |
| `rabbit-bob` | Idle ambient motion. |
| `ear-twitch-left` / `ear-twitch-right` | Subtle aliveness. |
| `blink` / `blink-delayed` | Subtle aliveness, staggered. |
| `nose-wiggle` | Subtle aliveness. |
| `broom-swish` | Action moment (e.g. "cleanup done"). |
| `dust-fade` | Paired with broom-swish. |
| `badge-pop` | Achievement / streak / count-up reveal. |

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
- `.btn-primary` / `.btn-primary-large` — solid orange CTA, no gradient.
  Hover = `hsl(var(--primary) / 92%)`. Disabled = muted background.
- `.title-page`, `.title-section` — heading typography with opsz active.
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
   `bg-primary` for buttons, `bg-background` for surfaces. The orange→red
   gradient survives **only** inside `.title-gradient` for the wordmark.
2. **Purple / violet / indigo accents.** Not in Qarote's palette. Orange is
   the brand color.
3. **3-column AI-slop feature grid.** Icon-in-colored-circle + bold title
   + 2-line description, repeated 3x symmetrically. See landing page
   "How it works" — use one strong composition (animated demo, interactive
   walkthrough) instead.
4. **Centered everything.** Don't put `text-align: center` on every heading
   and card. Use deliberate alignment based on content type.
5. **Bubbly border radius.** `--radius` is small (4px). Don't override locally
   to large unless there's a strong reason (e.g. avatar circles).
6. **Default font stacks (Inter, Roboto, Arial, system-ui).** UI text uses
   system-ui *intentionally* (zero web font request), but headings get
   Bricolage Grotesque — don't fall back to Inter for headings to "save
   bytes".
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
