import { Skeleton, SkeletonLine } from "@/components/ui/skeletons";

/**
 * Loading-state status dot for a switcher tile. Neither green (good) nor red
 * (down): a muted, gently-pulsing dot that reads as "checking", matching the
 * sidebar's `StatusTone === "loading"` tone (`bg-muted-foreground/30`). The
 * pulse is `animate-pulse`, which the global rule in `styles/index.css` swaps
 * for a static opacity hold under `prefers-reduced-motion: reduce`.
 *
 * Internal to this module: the only consumer is {@link SelectTileSkeleton}.
 */
function LoadingStatusDot() {
  return (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted-foreground/30"
    />
  );
}

/**
 * The org › workspace breadcrumb in its loading shape. Inline (no full
 * LoadingRegion) because it lives in the app bar alongside other controls;
 * `aria-busy` marks the segment as loading without a separate live region.
 * Consumed by ContextBreadcrumb.
 */
export function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-1.5" aria-busy="true">
      <Skeleton className="h-6 w-24 rounded-md" />
      <span aria-hidden="true" className="text-muted-foreground/40">
        ›
      </span>
      <Skeleton className="h-6 w-28 rounded-md" />
    </div>
  );
}

/**
 * A server / vhost select tile in its loading shape — square icon tile, a small
 * label line, and a value line optionally preceded by the loading-tone status
 * dot. Holds the AppSidebar context-card footprint during the initial fetch so
 * the "no servers configured" empty state never flashes. Consumed by AppSidebar.
 */
export function SelectTileSkeleton({ dot = false }: { dot?: boolean }) {
  return (
    <div
      aria-busy="true"
      className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-sidebar-border bg-sidebar px-2.5 py-2"
    >
      <Skeleton className="h-[26px] w-[26px] shrink-0 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <SkeletonLine width="w-2/5" className="h-2" />
        <div className="flex items-center gap-1.5">
          {dot && <LoadingStatusDot />}
          <SkeletonLine width="w-3/5" />
        </div>
      </div>
    </div>
  );
}
