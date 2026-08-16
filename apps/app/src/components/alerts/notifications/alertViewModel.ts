import {
  type RabbitMQAlert,
  RabbitMQAlertSeverity,
} from "@/lib/api/alertTypes";

/**
 * Unified view-model for the Notifications → Alerts tab.
 *
 * The active feed (getAlerts → RabbitMQAlert) and the resolved feed
 * (getResolvedAlerts → a different shape) carry different fields. The tab shows
 * both in ONE grouped/sorted/paginated list, so both are normalized to this VM
 * first. Keeping the normalization here (pure, tested) means the component only
 * deals with one shape and the grouping/sorting/pagination logic stays
 * verifiable without rendering.
 */

export type AlertVMStatus = "active" | "ack" | "resolved";

export interface AlertVM {
  id: string;
  severity: RabbitMQAlertSeverity;
  title: string;
  description: string;
  /** Affected resource (queue/node/exchange name); "—" when not applicable. */
  resource: string;
  serverName: string;
  vhost: string;
  status: AlertVMStatus;
  /** ISO timestamps. lastSeen is the resolve time for resolved alerts. */
  firstSeen: string;
  lastSeen?: string;
  durationMs?: number;
  acknowledgedAt?: string;
  resolvedAt?: string;
  /** Set when the alert maps to a diagnosable config finding (drives Explain). */
  findingId?: string;
  details: {
    current?: number | string;
    threshold?: number;
    recommended?: string;
    affected?: string[];
  };
}

/** Resolved-feed row shape (mirrors getResolvedAlerts output). */
export interface ResolvedAlertRow {
  id: string;
  title: string;
  description: string;
  severity: string;
  category?: string;
  details?: AlertVM["details"];
  firstSeenAt: string;
  resolvedAt: string;
  duration?: number | null;
  vhost?: string;
  source?: { type: string; name: string };
  serverName?: string;
}

const NO_RESOURCE = "—";

/** Severity sort order — most severe first. */
const SEV_ORDER: Record<RabbitMQAlertSeverity, number> = {
  [RabbitMQAlertSeverity.CRITICAL]: 0,
  [RabbitMQAlertSeverity.HIGH]: 1,
  [RabbitMQAlertSeverity.MEDIUM]: 2,
  [RabbitMQAlertSeverity.LOW]: 3,
  [RabbitMQAlertSeverity.INFO]: 4,
};

/** Severities in display order — also the severity-filter tab order. */
export const SEV_FILTERS: RabbitMQAlertSeverity[] = [
  RabbitMQAlertSeverity.CRITICAL,
  RabbitMQAlertSeverity.HIGH,
  RabbitMQAlertSeverity.MEDIUM,
  RabbitMQAlertSeverity.LOW,
  RabbitMQAlertSeverity.INFO,
];

function coerceSeverity(value: string): RabbitMQAlertSeverity {
  return value in SEV_ORDER
    ? (value as RabbitMQAlertSeverity)
    : RabbitMQAlertSeverity.INFO;
}

export function activeAlertToVM(alert: RabbitMQAlert): AlertVM {
  return {
    id: alert.id,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    resource: alert.source?.name || NO_RESOURCE,
    serverName: alert.serverName,
    vhost: alert.vhost || "/",
    status: alert.status === "ACKNOWLEDGED" ? "ack" : "active",
    firstSeen: alert.timestamp,
    lastSeen: alert.timestamp,
    acknowledgedAt: alert.acknowledgedAt,
    findingId: alert.findingId,
    details: alert.details,
  };
}

export function resolvedAlertToVM(
  alert: ResolvedAlertRow,
  serverName: string
): AlertVM {
  return {
    id: alert.id,
    severity: coerceSeverity(alert.severity),
    title: alert.title,
    description: alert.description,
    resource: alert.source?.name || NO_RESOURCE,
    serverName: alert.serverName || serverName,
    vhost: alert.vhost || "/",
    status: "resolved",
    firstSeen: alert.firstSeenAt,
    lastSeen: alert.resolvedAt,
    durationMs: alert.duration ?? undefined,
    resolvedAt: alert.resolvedAt,
    details: alert.details ?? {},
  };
}

/** Count of NON-resolved alerts per severity — drives the severity-tab badges. */
export function activeCountsBySeverity(
  alerts: AlertVM[]
): Record<RabbitMQAlertSeverity, number> {
  const counts = {
    [RabbitMQAlertSeverity.CRITICAL]: 0,
    [RabbitMQAlertSeverity.HIGH]: 0,
    [RabbitMQAlertSeverity.MEDIUM]: 0,
    [RabbitMQAlertSeverity.LOW]: 0,
    [RabbitMQAlertSeverity.INFO]: 0,
  };
  for (const a of alerts) {
    if (a.status !== "resolved") counts[a.severity] += 1;
  }
  return counts;
}

/** Total non-resolved alerts. */
export function activeCount(alerts: AlertVM[]): number {
  return alerts.filter((a) => a.status !== "resolved").length;
}

/**
 * Apply the show-resolved toggle + severity filter, then sort by severity and
 * recency (newest first within a severity). Pure — the component paginates the
 * result.
 */
export function filterAndSort(
  alerts: AlertVM[],
  opts: { showResolved: boolean; severity: RabbitMQAlertSeverity | "all" }
): AlertVM[] {
  return alerts
    .filter((a) => opts.showResolved || a.status !== "resolved")
    .filter((a) => opts.severity === "all" || a.severity === opts.severity)
    .sort(
      (x, y) =>
        SEV_ORDER[x.severity] - SEV_ORDER[y.severity] ||
        new Date(y.firstSeen).getTime() - new Date(x.firstSeen).getTime()
    );
}

/** Group an already-sorted list by severity, preserving severity order. */
export function groupBySeverity(
  alerts: AlertVM[]
): Array<[RabbitMQAlertSeverity, AlertVM[]]> {
  const groups = new Map<RabbitMQAlertSeverity, AlertVM[]>();
  for (const a of alerts) {
    const bucket = groups.get(a.severity);
    if (bucket) bucket.push(a);
    else groups.set(a.severity, [a]);
  }
  return SEV_FILTERS.filter((s) => groups.has(s)).map((s) => [
    s,
    groups.get(s) as AlertVM[],
  ]);
}
