/**
 * Cockpit time-range segmented control — the rounded pill selector in the
 * "What your agent sees" panel header (prototype `.seg`). It is a thin visual
 * shell over the shadcn ToggleGroup primitive; the option set and selected
 * value are the real {@link TimeRange} that drives `useLiveRatesMetrics`, so
 * switching ranges re-queries live rates exactly as before.
 *
 * NOTE: the design prototype mocked the labels as 2h / 24h / 7d / 30d. Those
 * windows are NOT backed by the live-rates API today (the real ranges are
 * 1m / 10m / 1h / 8h / 1d), so we render the real, API-backed ranges rather
 * than fake longer windows with no data behind them. When the backend grows
 * longer retention, extend `TimeRange` + this option list together.
 */

import { type TimeRange } from "@/components/TimeRangeSelector";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggleGroup";

const RANGE_OPTIONS: readonly TimeRange[] = [
  "1m",
  "10m",
  "1h",
  "8h",
  "1d",
] as const;

interface TimeRangeSegmentedProps {
  value: TimeRange;
  onValueChange: (value: TimeRange) => void;
  /** Accessible name for the group (e.g. t("sees.timeRange.label")). */
  label: string;
}

export function TimeRangeSegmented({
  value,
  onValueChange,
  label,
}: TimeRangeSegmentedProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix emits "" when the active item is re-pressed; ignore that so a
        // range is always selected (the panel can't query an empty window).
        if (next) onValueChange(next as TimeRange);
      }}
      aria-label={label}
      className="gap-0.5 rounded-full border border-border bg-muted/50 p-0.5"
    >
      {RANGE_OPTIONS.map((range) => (
        <ToggleGroupItem
          key={range}
          value={range}
          size="sm"
          className="h-7 rounded-full px-3 text-xs font-medium text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {range}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
