import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Clock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type HistoricalRange = 6 | 24 | 72 | 168 | 720;

const RANGE_OPTIONS: Array<{
  value: HistoricalRange;
  label: string;
}> = [
  { value: 6, label: "6h" },
  { value: 24, label: "24h" },
  { value: 72, label: "3d" },
  { value: 168, label: "7d" },
  { value: 720, label: "30d" },
];

const RANGE_VALUES: ReadonlyArray<HistoricalRange> = RANGE_OPTIONS.map(
  (opt) => opt.value
);
const SMALLEST_RANGE: HistoricalRange = RANGE_VALUES[0];

interface HistoricalRangeSelectorProps {
  value: HistoricalRange;
  onValueChange: (value: HistoricalRange) => void;
  /**
   * Plan-derived max queryable range, in hours. Options exceeding this
   * are rendered disabled with a "Pro" badge so users see the upgrade
   * surface area (per architecture review: disable, don't hide).
   */
  maxRangeHours: number;
  className?: string;
}

export const HistoricalRangeSelector = ({
  value,
  onValueChange,
  maxRangeHours,
  className = "",
}: HistoricalRangeSelectorProps) => {
  const { t } = useTranslation("common");

  // Pin the latest onValueChange in a ref so the clamp effect only
  // re-fires when value/maxRangeHours actually change. Without this,
  // a parent that doesn't memoise the callback would trigger the
  // effect on every render and re-emit the clamp event in a loop.
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  // Clamp the controlled value down when the plan ceiling drops below
  // the current selection (e.g. plan downgrade mid-session, or first
  // render before `useCurrentPlan` resolves and the parent ratchets
  // `maxRangeHours` upward). Otherwise the trigger would silently show
  // an out-of-range selection.
  useEffect(() => {
    if (value > maxRangeHours) {
      // Defensive ?? SMALLEST_RANGE: if maxRangeHours is mis-configured
      // below the smallest option, .pop() yields undefined; falling
      // back to the smallest known range still produces a valid
      // selection rather than silently skipping the clamp.
      const fallback =
        RANGE_VALUES.filter((h) => h <= maxRangeHours).pop() ?? SMALLEST_RANGE;
      if (fallback !== value) {
        onValueChangeRef.current(fallback);
      }
    }
  }, [value, maxRangeHours]);

  const handleValueChange = (raw: string) => {
    const next = Number(raw);
    // Reject NaN, non-finite, and unknown values before they reach the
    // downstream histogram query. Radix Select sources `raw` from the
    // SelectItem `value` prop so the enum check is normally trivial,
    // but a stale dev-tools edit or a misconfigured caller could
    // otherwise punch through.
    const known = RANGE_VALUES.includes(next as HistoricalRange);
    if (!Number.isFinite(next) || !known) return;
    if (next > maxRangeHours) return;
    onValueChange(next as HistoricalRange);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Clock className="w-3 h-3 text-muted-foreground" />
      <Select value={String(value)} onValueChange={handleValueChange}>
        <SelectTrigger className="w-28 h-7 text-xs">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((opt) => {
            const blocked = opt.value > maxRangeHours;
            return (
              <SelectItem
                key={opt.value}
                value={String(opt.value)}
                disabled={blocked}
              >
                <span className="flex items-center gap-1.5">
                  {opt.label}
                  {blocked && (
                    <span
                      className="text-[10px] font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-1 rounded"
                      // Surface the reason in the option's accessible
                      // name. Without this, screen-reader users hear
                      // "dimmed/unavailable" but not why.
                      aria-label={t("proPlanRequired")}
                    >
                      {t("pro")}
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
