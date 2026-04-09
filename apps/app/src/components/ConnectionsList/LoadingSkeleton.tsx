import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the Connections list page — approximates the header,
 * three-card stats strip, and the collapsible connection list so the
 * swap from skeleton to real content doesn't jump the layout.
 */
export function LoadingSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
