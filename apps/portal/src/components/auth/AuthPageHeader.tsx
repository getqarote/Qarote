import { ComponentType, ReactNode } from "react";

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthPageHeaderProps {
  Icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  variant?: "primary" | "success" | "destructive";
}

export function AuthPageHeader({
  Icon,
  title,
  description,
  variant = "primary",
}: AuthPageHeaderProps) {
  const bgClass =
    variant === "success"
      ? "bg-success-muted"
      : variant === "destructive"
        ? "bg-destructive/10"
        : "bg-primary/10";

  const iconColorClass =
    variant === "success"
      ? "text-success"
      : variant === "destructive"
        ? "text-destructive"
        : "text-primary";

  return (
    <CardHeader className="text-center">
      <div
        className={`mx-auto mb-4 h-12 w-12 rounded-full ${bgClass} flex items-center justify-center`}
        aria-hidden="true"
      >
        <Icon className={`h-6 w-6 ${iconColorClass}`} />
      </div>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}
