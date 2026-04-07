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
 * - Sets up the architectural foundation for a future deliberate palette
 *   curation pass (e.g. ColorBrewer, schemeCategory10) and dark mode
 *   adaptation via CSS variables
 *
 * Conventions:
 * - One named export per data series (even when two series happen to share
 *   the same hex value today). This preserves the option to evolve them
 *   independently without renaming call sites.
 * - Comments include the conceptual hue so a future palette refactor can
 *   maintain visual identity even if the exact hex changes.
 *
 * Current values are inherited from the original inline `<Line stroke="#XXX">`
 * usage in the chart components — preserved verbatim by the extraction. A
 * dedicated palette curation pass can replace these with a deliberately
 * designed data viz palette without touching the call sites.
 */

// MessagesRatesChart series — message flow on a RabbitMQ broker
export const CHART_PUBLISH = "#F97316"; // orange
export const CHART_CONFIRM = "#F59E0B"; // amber
export const CHART_DELIVER = "#3B82F6"; // blue
export const CHART_DELIVER_GET = "#EC4899"; // pink
export const CHART_DELIVER_NO_ACK = "#F472B6"; // pink-light
export const CHART_ACK = "#10B981"; // emerald
export const CHART_REDELIVER = "#8B5CF6"; // violet
export const CHART_GET = "#06B6D4"; // cyan
export const CHART_GET_NO_ACK = "#C4B5FD"; // light purple
export const CHART_GET_EMPTY = "#92400E"; // brown
export const CHART_REJECT = "#6366F1"; // indigo
export const CHART_RETURN_UNROUTABLE = "#1E40AF"; // deep indigo
export const CHART_DROP_UNROUTABLE = "#FDE047"; // yellow
export const CHART_DISK_WRITES = "#DC2626"; // red
export const CHART_DISK_READS = "#059669"; // green

// QueuedMessagesChart series — message backlog (total/ready/unacked)
//
// Note: these happen to share hex values with CHART_DISK_WRITES, CHART_CONFIRM,
// and CHART_GET respectively. They're defined separately so the two charts can
// evolve independently if a future palette refactor wants different colors for
// "queued total" vs "disk writes" (different semantic concepts that just
// happen to look the same today).
export const CHART_QUEUED_TOTAL = "#DC2626"; // red
export const CHART_QUEUED_READY = "#F59E0B"; // amber
export const CHART_QUEUED_UNACKED = "#06B6D4"; // cyan
