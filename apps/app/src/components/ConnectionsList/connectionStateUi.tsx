import { ReactNode } from "react";

import { Cable, Globe, Link, Network, Radio, Wifi } from "lucide-react";

/**
 * Visual metadata for a connection's runtime state. Centralised here
 * so the icon + badge color + text color choices stay consistent
 * between the row header and anywhere else the state surfaces (e.g.
 * channel sub-rows re-use `getStateBadgeClass` for the channel state).
 *
 * Palette mapping follows the "status is the loudest thing on the
 * screen, but only when it matters" principle:
 *   running  → success   (healthy, most common — quiet confirmation)
 *   blocked  → warning   (attention without panic)
 *   flow     → info      (informational, load-shedding in progress)
 *   closing  → destructive (tearing down, don't act on it)
 *   other    → muted     (unknown / neutral fallback)
 */
type ConnectionState = "running" | "blocked" | "flow" | "closing" | "other";

function normalizeState(state?: string): ConnectionState {
  const lower = state?.toLowerCase();
  if (
    lower === "running" ||
    lower === "blocked" ||
    lower === "flow" ||
    lower === "closing"
  ) {
    return lower;
  }
  return "other";
}

export function getStateBadgeClass(state?: string): string {
  switch (normalizeState(state)) {
    case "running":
      return "bg-success-muted text-success";
    case "blocked":
      return "bg-warning-muted text-warning";
    case "flow":
      return "bg-info-muted text-info";
    case "closing":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-foreground";
  }
}

export function getStateIconColorClass(state?: string): string {
  switch (normalizeState(state)) {
    case "running":
      return "text-success";
    case "blocked":
      return "text-warning";
    case "flow":
      return "text-info";
    case "closing":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Picks an icon by state first, falling back to protocol. State icons
 * are more informative for operators scanning a list — a `blocked`
 * connection matters more than whether it's AMQP or MQTT.
 */
export function getConnectionIcon(
  state?: string,
  protocol?: string
): ReactNode {
  const iconClass = "h-4 w-4";
  switch (normalizeState(state)) {
    case "running":
      return <Wifi className={iconClass} />;
    case "blocked":
      return <Cable className={iconClass} />;
    case "flow":
      return <Radio className={iconClass} />;
    case "closing":
      return <Link className={iconClass} />;
    default:
      return protocol?.toLowerCase() === "amqp" ? (
        <Network className={iconClass} />
      ) : (
        <Globe className={iconClass} />
      );
  }
}

/**
 * Formats a byte count into a human-readable string with the largest
 * sensible unit. Operators scanning traffic stats want "42 MB", not
 * "44040192 B" — the precision trade-off (2 decimal places) is fine
 * because these are display numbers, not accounting values.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
