import * as React from "react";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, className, ...props }, ref) => (
    <Card ref={ref} className={cn("mx-auto max-w-lg", className)} {...props}>
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <Icon className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="max-w-md text-muted-foreground">{description}</p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  )
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
export type { EmptyStateProps };
