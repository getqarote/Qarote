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
 *
 * The Shield sits in a primary-tinted circular badge (same
 * treatment as the other settings surface headers like
 * `OrgContextHeader`) — this is the one confident accent on the
 * page, signaling "trust / security" without shouting.
 */
export function SSOHeader({ title, description }: SSOHeaderProps) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <div
        className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
        aria-hidden="true"
      >
        <Shield className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
