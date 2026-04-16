import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <>
      {/* Header: back button + title + badges */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <SidebarTrigger className="mr-2 mt-1" />
          <Skeleton className="h-8 w-8 mt-1 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <Skeleton className="h-9 w-16" />
      </div>

      {/* Permissions section: heading + table rows */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-muted/20">
            <Skeleton className="h-4 w-full" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3 border-t border-border"
            >
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-8">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Add permission button */}
      <Skeleton className="h-10 w-full rounded-none" />

      {/* Danger zone accordion */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </>
  );
}
