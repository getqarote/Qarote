import {
  Skeleton,
  SkeletonLine,
  SkeletonTableRow,
} from "@/components/ui/skeletons";

import { LoadingRegion } from "./LoadingRegion";

/**
 * Settings table loading shape — a stack of rows mirroring the members, agent
 * keys, and audit tables (leading avatar + name/meta + trailing status pill),
 * so a settings panel keeps its height while the list query resolves.
 */
export function SettingsTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <LoadingRegion>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} leading="avatar" trailing="pill" />
        ))}
      </div>
    </LoadingRegion>
  );
}

/**
 * Settings form loading shape — labelled field sections plus a submit button,
 * mirroring the SMTP / organization / LLM form panels so the form holds its
 * footprint while its current values load.
 */
export function SettingsFormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <LoadingRegion>
      <div className="flex max-w-[520px] flex-col gap-[18px] rounded-xl border border-border bg-card p-[22px]">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonLine width="w-24" className="h-2.5" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32" />
      </div>
    </LoadingRegion>
  );
}
