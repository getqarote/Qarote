import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-5 w-72" />
      {/* State filter skeleton */}
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
      {/* Table skeleton matching real structure */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="flex items-center px-4 py-2 border-b border-border bg-muted/30 gap-3">
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14 text-right" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center px-4 py-3 gap-3 border-b border-border last:border-0"
          >
            <Skeleton className="h-5 w-8 rounded-md shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full shrink-0" />
            <Skeleton className="h-4 w-16 hidden sm:block shrink-0" />
            <Skeleton className="h-4 w-10 text-right shrink-0" />
          </div>
        ))}
      </div>
    </>
  );
}
