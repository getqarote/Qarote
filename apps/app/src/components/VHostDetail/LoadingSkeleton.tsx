import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <>
      {/* Header: back + title + badges + edit */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <SidebarTrigger className="mr-2 mt-1" />
          <Skeleton className="h-8 w-8 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40 mt-1" />
          </div>
        </div>
        <Skeleton className="h-9 w-16" />
      </div>

      {/* Stats: 3 columns */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Monitoring */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-44" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-8 w-14" />
          </div>
          <Skeleton className="h-3 w-64" />
        </div>
      </div>

      {/* Permissions table */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/20 px-4 py-2">
            <div className="flex items-center">
              <Skeleton className="h-3 w-16 flex-1" />
              <Skeleton className="h-3 w-24 ml-4" />
              <Skeleton className="h-3 w-24 ml-4" />
              <Skeleton className="h-3 w-24 ml-4" />
              <Skeleton className="h-3 w-16 ml-4" />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center px-4 py-3 border-t border-border"
            >
              <Skeleton className="h-4 w-20 flex-1" />
              <Skeleton className="h-4 w-8 ml-4" />
              <Skeleton className="h-4 w-8 ml-4" />
              <Skeleton className="h-4 w-8 ml-4" />
              <Skeleton className="h-7 w-16 ml-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Set permission button skeleton */}
      <Skeleton className="h-9 w-full" />

      {/* Danger zone accordion skeleton */}
      <div className="border border-border rounded-lg px-4 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
    </>
  );
}
