import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the SSO settings page while the provider config loads.
 * Mirrors the header + two stacked cards the real UI renders.
 */
export function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
