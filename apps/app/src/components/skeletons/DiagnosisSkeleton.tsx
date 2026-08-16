import {
  Skeleton,
  SkeletonAvatar,
  SkeletonLine,
} from "@/components/ui/skeletons";

import { LoadingRegion } from "./LoadingRegion";

/**
 * Diagnosis loading shape — a summary strip above stacked finding cards,
 * mirroring DiagnosisSummary + DiagnosisCard so the panel keeps its height
 * while the analysis loads.
 */
export function DiagnosisSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-4">
        {/* Severity summary strip */}
        <div className="flex flex-wrap gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>

        {/* Finding cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <SkeletonAvatar size="h-5 w-5" />
              <SkeletonLine width="w-2/5" className="h-3.5" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
            <SkeletonLine width="w-4/5" className="h-2.5" />
            <SkeletonLine width="w-3/5" className="h-2.5" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
