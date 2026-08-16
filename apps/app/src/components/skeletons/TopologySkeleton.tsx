import { Skeleton, SkeletonLine } from "@/components/ui/skeletons";

import { LoadingRegion } from "./LoadingRegion";

/** Per-group item-row widths, so the checkable lists read as real labels. */
const ITEM_WIDTHS = ["w-1/2", "w-3/5", "w-2/5", "w-3/4"];

/**
 * Topology loading shape — mirrors the loaded graph container: a stats/filter
 * toolbar strip above a flex row of the left filter list (search + grouped,
 * checkable items) beside the graph canvas, which is a single soft placeholder
 * (no fake nodes/edges, per LOADERS.md). The container holds the same border +
 * `calc(100vh-16rem)` canvas height as the real graph, so nothing shifts when
 * the topology query resolves.
 */
export function TopologySkeleton() {
  return (
    <LoadingRegion>
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Toolbar strip — stats on the left, filter toggles on the right */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-5">
            <SkeletonLine width="w-24" className="h-2.5" />
            <SkeletonLine width="w-20" className="h-2.5" />
            <SkeletonLine width="w-24" className="h-2.5" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        </div>

        {/* Filter list + graph canvas */}
        <div className="flex" style={{ height: "calc(100vh - 16rem)" }}>
          <div className="hidden w-[260px] shrink-0 flex-col gap-3 border-r border-border p-3.5 md:flex">
            <Skeleton className="h-9 w-full rounded-md" />
            {Array.from({ length: 2 }).map((_, g) => (
              <div key={g} className="flex flex-col gap-2.5">
                <SkeletonLine width="w-2/5" className="h-2.5" />
                {ITEM_WIDTHS.map((w, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
                    <SkeletonLine width={w} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Graph zone — soft placeholder, no fake nodes/edges */}
          <div className="grid flex-1 place-items-center">
            <Skeleton className="h-3/5 w-3/5 rounded-xl opacity-50" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
