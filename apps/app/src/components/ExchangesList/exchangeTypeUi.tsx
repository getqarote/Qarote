import { ReactNode } from "react";

import { Activity, GitBranch, Hash, Radio, Share2 } from "lucide-react";

/**
 * Visual metadata for an exchange type. Centralised here so the icon +
 * badge color choices don't drift between the overview cards, the filter
 * tabs, and the collapsible row header.
 *
 * All colors go through semantic tokens (`text-info`, `bg-success-muted`,
 * etc.) so light and dark themes both render correctly. The palette
 * mapping is deliberate:
 *   direct  → info        (quiet, precise routing)
 *   fanout  → success     (broadcast, active feel)
 *   topic   → muted       (neutral, pattern-based)
 *   headers → warning     (less common, low-key attention)
 *   other   → muted       (fallback)
 */
type ExchangeTypeKey = "direct" | "fanout" | "topic" | "headers" | "other";

function normalizeExchangeType(type: string): ExchangeTypeKey {
  const lower = type.toLowerCase();
  if (
    lower === "direct" ||
    lower === "fanout" ||
    lower === "topic" ||
    lower === "headers"
  ) {
    return lower;
  }
  return "other";
}

export function getExchangeIcon(type: string, className?: string): ReactNode {
  const cls = className ?? "h-4 w-4";
  switch (normalizeExchangeType(type)) {
    case "direct":
      return <GitBranch className={cls} />;
    case "fanout":
      return <Radio className={cls} />;
    case "topic":
      return <Share2 className={cls} />;
    case "headers":
      return <Hash className={cls} />;
    default:
      return <Activity className={cls} />;
  }
}

export function getExchangeTypeBadgeClass(type: string): string {
  switch (normalizeExchangeType(type)) {
    case "direct":
      return "bg-info-muted text-info";
    case "fanout":
      return "bg-success-muted text-success";
    case "headers":
      return "bg-warning-muted text-warning";
    case "topic":
    default:
      return "bg-muted text-muted-foreground";
  }
}
