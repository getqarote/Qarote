import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-md bg-card backdrop-blur-sm">
          <CardContent className="p-6">
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-6 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
