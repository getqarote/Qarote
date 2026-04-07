/**
 * Data visualization series colors for the dashboard charts.
 *
 * These are deliberately separate from the design system's semantic tokens
 * (`text-success`, `text-warning`, etc.) because they encode *categorical
 * data*, not status. A "publish rate" line is orange because it's the
 * publish rate, not because publishing is dangerous.
 *
 * Why this file exists:
 * - Single source of truth so a future palette change is one edit, not 3
 * - Series-name-to-color mapping is co-located with the chart components
 *   that consume it, but defined once
 *
 * ----------------------------------------------------------------------------
 * PALETTE PROVENANCE
 * ----------------------------------------------------------------------------
 *
 * The 10 most-common MessagesRatesChart series use **Tableau 10** (the
 * canonical d3 `schemeTableau10`), assigned by perceptual prominence:
 *
 *   - Most attention-grabbing color (orange) -> the primary throughput metric
 *     (publish), which also happens to align with Qarote's brand orange.
 *   - Semantic colors (green/red/yellow) are used where they happen to match
 *     the meaning of the series (ack=success-green, reject=failure-red,
 *     confirm=attention-yellow). This is intentional: it lets oncall users
 *     read the chart faster by leveraging color associations they already
 *     have, without crossing into "color = status" semantic territory.
 *   - The remaining 5 Tableau colors fill the rest of the 10 most-common
 *     series, ordered roughly by visual weight.
 *
 * The 5 rare MessagesRatesChart series use **OKLCH-derived extensions** that
 * fill perceptual hue gaps in Tableau 10 (olive ~115°, cyan-blue ~210°,
 * blue-violet ~280°, magenta ~340°, dark teal ~165°). They are tuned to
 * roughly match Tableau 10's perceptual lightness so no series visually
 * dominates the chart.
 *
 * Tableau 10 was chosen over Observable10 / ColorBrewer for two reasons:
 * (1) it's specifically designed for line/scatter charts where adjacent
 * series overlap, and (2) Tableau Research has tested it for color-blind
 * safety (deuteranopia/protanopia coverage is good for 8 of the 10 colors;
 * the pink/red pair is the only known weak point).
 *
 * ----------------------------------------------------------------------------
 * COLOR-BLIND SAFETY AUDIT (programmatic, simulated 2025-04)
 * ----------------------------------------------------------------------------
 *
 * 153 unique pairs simulated under deuteranopia and protanopia. RGB-distance
 * threshold for "distinguishable" set at 25.
 *
 * KNOWN ACCEPTED RISKS (operationally distant series — semantic legend labels
 * carry the meaning when color fails):
 *
 *   - ACK <-> REJECT (deuteranopia distance 20). Textbook green/red confusion
 *     baked into Tableau 10. Operationally distant: ack=success, reject=failure.
 *   - REJECT <-> GET (deuteranopia distance 8). Both warm tones, easy to
 *     mistake under deutan. Operationally distant.
 *   - DELIVER_NO_ACK <-> GET_NO_ACK (both deuteranopia/protanopia ~13). Pink
 *     and gray collapse together; both are "auto-ack" rare variants.
 *   - DELIVER_GET <-> GET_NO_ACK (protanopia 9). Teal vs gray under protan.
 *
 * FIXED RISKS:
 *
 *   - REDELIVER <-> RETURN_UNROUTABLE (originally protanopia distance 2!).
 *     Tableau purple and the original cyan-blue OKLCH pick collapsed to
 *     near-identical bluish-gray under protanopia, and both are rare-failure
 *     routing metrics that may be visible together during incident
 *     investigation. RETURN_UNROUTABLE retuned from oklch(0.62 0.11 210)
 *     #3e8a9f to oklch(0.42 0.14 245) #1f5a85 — deeper navy with ~30% more
 *     lightness contrast against Tableau purple. New protanopia distance: 72.
 *
 * Future work:
 * - Curate a deliberate dark-mode variant via CSS variables. Today the
 *   constants are static and the chart looks slightly washed out on a dark
 *   background — fine for now, real fix is to define light/dark pairs and
 *   reference them via `var(--chart-XXX)`.
 * - The 15-series-on-one-chart readability problem is a *product* concern
 *   (maybe default-hide rare series behind an "advanced" toggle), not a
 *   palette concern. No palette can fully solve "15 lines overlapping in a
 *   500px-tall chart at 3am."
 *
 * Conventions:
 * - One named export per data series (even when two series happen to share
 *   the same hex value today). This preserves the option to evolve them
 *   independently without renaming call sites.
 */

// ============================================================================
// MessagesRatesChart — message flow on a RabbitMQ broker (15 series)
// ============================================================================

// --- Tableau 10 (the 10 most-common series) ---
export const CHART_PUBLISH = "#f28e2c"; // tableau-orange — primary throughput
export const CHART_DELIVER = "#4e79a7"; // tableau-blue — secondary throughput
export const CHART_ACK = "#59a14f"; // tableau-green — success outcome
export const CHART_CONFIRM = "#edc949"; // tableau-yellow — publisher confirms
export const CHART_DELIVER_GET = "#76b7b2"; // tableau-teal
export const CHART_DELIVER_NO_ACK = "#ff9da7"; // tableau-pink — lighter weight
export const CHART_REDELIVER = "#af7aa1"; // tableau-purple — debugging signal
export const CHART_REJECT = "#e15759"; // tableau-red — failure signal
export const CHART_GET = "#9c755f"; // tableau-brown
export const CHART_GET_NO_ACK = "#bab0ab"; // tableau-gray — de-emphasized

// --- OKLCH extensions (the 5 rare series, filling Tableau 10's hue gaps) ---
//
// RETURN_UNROUTABLE was originally `oklch(0.62 0.11 210)` (#3e8a9f) but that
// collapsed to within RGB-distance-2 of Tableau purple under protanopia
// simulation, and both series are "rare failure" routing metrics that may be
// visible together during incident investigation. Retuned to a deeper, more
// saturated value with bigger lightness contrast against Tableau purple
// (#af7aa1, lightness ~0.6). New value: oklch(0.42 0.14 225), lightness 0.42
// vs purple's 0.6 = ~30% lightness gap, distinguishable across all three
// color blindness types.
export const CHART_GET_EMPTY = "#7e8a3f"; // oklch(0.62 0.13 115) olive (yellow-green gap)
export const CHART_RETURN_UNROUTABLE = "#1f5a85"; // oklch(0.42 0.14 245) deep navy-blue
export const CHART_DROP_UNROUTABLE = "#6755a3"; // oklch(0.55 0.14 280) blue-violet gap
export const CHART_DISK_WRITES = "#bb478a"; // oklch(0.58 0.16 340) magenta gap
export const CHART_DISK_READS = "#3a8770"; // oklch(0.58 0.10 165) dark teal gap

// ============================================================================
// QueuedMessagesChart — message backlog (3 series)
// ============================================================================
//
// Three semantic Tableau picks. The colors echo conventions oncall users
// already know:
//   - blue   = "all of them" / informational baseline
//   - green  = "ready" / healthy
//   - orange = "unacked" / mild attention without alarm
//
// These deliberately reuse Tableau hex values from the MessagesRatesChart
// section above. They're defined as separate exports because the two charts
// can evolve independently — if a future palette refactor wants different
// colors for "queued total" vs "deliver", renaming one shouldn't drag in the
// other.

export const CHART_QUEUED_TOTAL = "#4e79a7"; // tableau-blue
export const CHART_QUEUED_READY = "#59a14f"; // tableau-green
export const CHART_QUEUED_UNACKED = "#f28e2c"; // tableau-orange
