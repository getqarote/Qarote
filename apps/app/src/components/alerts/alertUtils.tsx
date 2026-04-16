import { RabbitMQAlertSeverity } from "@/lib/api/alertTypes";

// Alert utility functions for consistent alert rendering across the application

/**
 * Get colored dot + badge classes for a given severity (clean alert style).
 */
export const getSeverityColor = (
  severity: RabbitMQAlertSeverity
): { dot: string; badge: string } => {
  switch (severity) {
    case RabbitMQAlertSeverity.CRITICAL:
      return {
        dot: "bg-red-500",
        badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
      };
    case RabbitMQAlertSeverity.HIGH:
      return {
        dot: "bg-orange-500",
        badge:
          "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
      };
    case RabbitMQAlertSeverity.MEDIUM:
      return {
        dot: "bg-yellow-500",
        badge:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
      };
    case RabbitMQAlertSeverity.LOW:
      return {
        dot: "bg-blue-500",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
      };
    case RabbitMQAlertSeverity.INFO:
      return {
        dot: "bg-muted-foreground",
        badge: "bg-muted text-muted-foreground",
      };
    default:
      return {
        dot: "bg-muted-foreground",
        badge: "bg-muted text-muted-foreground",
      };
  }
};

/**
 * Format a timestamp string to a localized date/time string
 */
export const formatTimestamp = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

/**
 * Format a timestamp to relative time (e.g., "5m ago", "2h ago")
 */
export const formatRelativeTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return "Unknown";
  }
};
