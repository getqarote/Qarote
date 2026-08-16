import { cn } from "@/lib/utils";

import { Skeleton } from "./Skeleton";

/**
 * Reusable skeleton primitives. Each one composes the base {@link Skeleton}
 * block so the shimmer + reduced-motion contract is defined once. All sizing is
 * token-based Tailwind; widths that vary by call-site are passed as a Tailwind
 * width class so the caller stays declarative and theme-aware.
 *
 * These primitives are the building blocks; per-surface skeletons (CockpitSkeleton,
 * AlertsListSkeleton, …) assemble them into shapes that mirror real content.
 */

/** A single line of text. `width` is a Tailwind width class (e.g. "w-2/5"). */
export function SkeletonLine({
  width = "w-full",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return <Skeleton className={cn("h-3 rounded", width, className)} />;
}

/** A round avatar placeholder. `size` is a Tailwind size class (e.g. "h-9 w-9"). */
export function SkeletonAvatar({
  size = "h-9 w-9",
  className,
}: {
  size?: string;
  className?: string;
}) {
  return <Skeleton className={cn("shrink-0 rounded-full", size, className)} />;
}

/** A metric stat cell — small label line over a larger value line. */
export function SkeletonStatCell({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 bg-card px-3 py-3", className)}>
      <SkeletonLine width="w-1/2" className="h-2.5" />
      <SkeletonLine width="w-3/4" className="h-4" />
    </div>
  );
}

/** A bordered card surface that wraps arbitrary skeleton content. */
export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-5", className)}
    >
      {children}
    </div>
  );
}

/**
 * A table/list row: optional leading shape (avatar or square icon) + a stacked
 * title/subtitle, with an optional trailing pill (status badge / action).
 */
export function SkeletonTableRow({
  leading = "square",
  trailing = "pill",
  className,
}: {
  leading?: "avatar" | "square" | "none";
  trailing?: "pill" | "actions" | "none";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3.5 px-4 py-3.5", className)}>
      {leading === "avatar" && <SkeletonAvatar size="h-7 w-7" />}
      {leading === "square" && (
        <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
      )}
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonLine width="w-2/5" />
        <SkeletonLine width="w-3/5" className="h-2.5" />
      </div>
      {trailing === "pill" && (
        <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
      )}
      {trailing === "actions" && (
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      )}
    </div>
  );
}

export { Skeleton };
