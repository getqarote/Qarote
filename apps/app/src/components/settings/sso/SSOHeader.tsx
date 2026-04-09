import { ReactNode } from "react";

import { Shield } from "lucide-react";

interface SSOHeaderProps {
  title: ReactNode;
  description: ReactNode;
}

/**
 * Shared header for all SSO settings surfaces — edit form, setup
 * form, and upgrade prompt. Uses the same Shield icon + title +
 * description layout so the operator's position is stable as they
 * move between those states.
 */
export function SSOHeader({ title, description }: SSOHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <Shield className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
