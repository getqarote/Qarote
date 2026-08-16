import {
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonLine,
  SkeletonStatCell,
} from "@/components/ui/skeletons";

import { LoadingRegion } from "./LoadingRegion";

/**
 * Cockpit (Home) loading shape — mirrors ConnectionBar, AgentBlock, the
 * WhatAgentSees metric grid + charts, and the findings cards, so the skeleton
 * occupies the same footprint as the loaded page (no layout shift). The chart
 * zones are a single soft block (no fake curves/nodes), per LOADERS.md.
 */
export function CockpitSkeleton() {
  return (
    <LoadingRegion>
      <div className="content-container-large !space-y-6">
        {/* ConnectionBar */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <SkeletonLine width="w-24" />
          <SkeletonLine width="w-40" className="h-2.5" />
        </div>

        {/* AgentBlock */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <SkeletonAvatar size="h-9 w-9" />
          <div className="flex flex-1 flex-col gap-2">
            <SkeletonLine width="w-1/3" />
            <SkeletonLine width="w-3/5" className="h-2.5" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>

        {/* Metric grid — 8 stat cells */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonStatCell key={i} />
          ))}
        </div>

        {/* Charts — header + a soft block for the graph zone */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <SkeletonLine width="w-28" />
                <SkeletonLine width="w-12" className="h-2.5" />
              </div>
              <Skeleton className="mt-4 h-28 w-full" />
            </div>
          ))}
        </div>

        {/* Findings — placeholder cards */}
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} className="flex items-center gap-3">
              <SkeletonAvatar size="h-5 w-5" />
              <div className="flex flex-1 flex-col gap-2">
                <SkeletonLine width="w-2/5" />
                <SkeletonLine width="w-3/5" className="h-2.5" />
              </div>
              <Skeleton className="h-7 w-20" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
