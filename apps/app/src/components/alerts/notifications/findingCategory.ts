/**
 * Config-scan category model for the Notifications → Config scan tab.
 *
 * Findings carry a `resourceType` (queue, exchange, node, …); the prototype
 * groups them into category pills (queues, exchanges, bindings, …). This maps
 * one to the other and owns the canonical pill order — pure so the counts /
 * filtering logic stays testable.
 */

/** Category pills in display order (prototype `SCAN_CATS`). */
export const FINDING_CATEGORIES = [
  "queues",
  "exchanges",
  "bindings",
  "consumers",
  "connections",
  "nodes",
  "policies",
  "users",
  "vhosts",
] as const;

export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

const RESOURCE_TYPE_TO_CATEGORY: Record<string, FindingCategory> = {
  queue: "queues",
  exchange: "exchanges",
  binding: "bindings",
  consumer: "consumers",
  connection: "connections",
  node: "nodes",
  // Cluster-wide findings (even node count, version skew) live under nodes —
  // the prototype has no separate "cluster" pill.
  cluster: "nodes",
  policy: "policies",
  user: "users",
  vhost: "vhosts",
};

/** Map a finding's resourceType to its pill category (nodes is the fallback). */
export function resourceTypeToCategory(resourceType: string): FindingCategory {
  return RESOURCE_TYPE_TO_CATEGORY[resourceType] ?? "nodes";
}

/** Count open findings per category — drives the pill badges. */
export function categoryCounts<T extends { resourceType: string }>(
  findings: T[]
): Record<FindingCategory, number> {
  const counts = Object.fromEntries(
    FINDING_CATEGORIES.map((c) => [c, 0])
  ) as Record<FindingCategory, number>;
  for (const f of findings) {
    counts[resourceTypeToCategory(f.resourceType)] += 1;
  }
  return counts;
}
