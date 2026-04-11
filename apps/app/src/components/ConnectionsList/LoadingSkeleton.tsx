import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the Connections page — header, inline stat line, and
 * connection rows. Matches the new layout (no hero metric cards).
 */
export function LoadingSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-5 w-80" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
