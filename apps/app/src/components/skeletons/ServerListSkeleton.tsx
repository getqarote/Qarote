import { Skeleton, SkeletonLine } from "@/components/ui/skeletons";

import { LoadingRegion } from "./LoadingRegion";

/**
 * Server list loading shape — mirrors the ServerCard rows in ServerManagement
 * (name + endpoint line, action buttons) so the dialog body doesn't jump when
 * the servers query resolves.
 */
export function ServerListSkeleton() {
  return (
    <LoadingRegion>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border p-4"
          >
            <div className="flex flex-col gap-2">
              <SkeletonLine width="w-32" className="h-3.5" />
              <SkeletonLine width="w-48" className="h-2.5" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
