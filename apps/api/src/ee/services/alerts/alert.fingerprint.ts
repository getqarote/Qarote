import { AlertCategory } from "./alert.interfaces";

/**
 * Generate alert ID (includes timestamp for uniqueness)
 */
export function generateAlertId(
  serverId: string,
  category: AlertCategory,
  source: string
): string {
  return `${serverId}-${category}-${source}-${Date.now()}`;
}

/**
 * Generate stable alert fingerprint (without timestamp) for tracking seen alerts
 * Includes vhost for queue-related alerts to distinguish same queue name in different vhosts
 */
export function generateAlertFingerprint(
  serverId: string,
  category: AlertCategory,
  sourceType: "node" | "queue" | "cluster",
  sourceName: string,
  vhost?: string
): string {
  // Include vhost in fingerprint for queue alerts to ensure same queue name in different vhosts are tracked separately
  if (sourceType === "queue" && vhost) {
    return `${serverId}-${category}-${sourceType}-${vhost}-${sourceName}`;
  }
  return `${serverId}-${category}-${sourceType}-${sourceName}`;
}
