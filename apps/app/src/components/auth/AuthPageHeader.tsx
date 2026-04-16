import { ComponentType, ReactNode } from "react";

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthPageHeaderProps {
  /**
   * Icon rendered inside the circular primary-tinted badge at the top
   * of the card. Accepts any component that takes a `className` prop —
   * both Lucide icons and pixel-art icon components work here.
   */
  Icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  /**
   * Variant affects the icon badge tint. `primary` is the default
   * for informational / invitation states; `success` for post-accept
   * confirmations; `destructive` for error states.
   */
  variant?: "primary" | "success" | "destructive";
}

/**
 * Shared card header for all auth/invitation pages. The original
 * PageWrapper pattern had each page re-roll a `CardHeader` with a
 * circular Icon badge, title, and description — ~8 lines of JSX
 * repeated 6+ times across the auth surface. This centralizes the
 * badge sizing, color token, and spacing once.
 */
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
