import { Skeleton, SkeletonTableRow } from "@/components/ui/skeletons";

import { LoadingRegion } from "./LoadingRegion";

/** Category-pill widths — varied so the row reads like real category filters. */
const PILL_WIDTHS = ["w-16", "w-20", "w-14", "w-20", "w-16", "w-24", "w-14"];

/**
 * Notifications loading shape — the severity-summary line, the category pills,
 * then a list of alert / config-finding rows (icon + title + two meta lines),
 * mirroring AlertsSummary + the category filter bar + AlertItem so the page
 * holds its footprint while the feed loads.
 */
export function AlertsListSkeleton() {
  return (
    <LoadingRegion>
      {/* Severity summary line */}
      <div className="mb-4 flex flex-wrap gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>

      {/* Category pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PILL_WIDTHS.map((w, i) => (
          <Skeleton key={i} className={`h-[30px] rounded-full ${w}`} />
        ))}
      </div>

      {/* Alert / config-finding rows */}
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonTableRow key={i} leading="square" trailing="pill" />
        ))}
      </div>
    </LoadingRegion>
  );
}
