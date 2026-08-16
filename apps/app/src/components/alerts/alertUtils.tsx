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
 * Border-left / dot accent token class for a given severity. Shared across the
 * cockpit, notifications, and config-scan surfaces so the severity color
 * system stays identical everywhere. critical/high → destructive, medium →
 * warning, low → info, else muted-foreground.
 */
export const getSeverityAccent = (
  severity: RabbitMQAlertSeverity
): { border: string; text: string; bg: string } => {
  switch (severity) {
    case RabbitMQAlertSeverity.CRITICAL:
    case RabbitMQAlertSeverity.HIGH:
      return {
        border: "border-l-destructive",
        text: "text-destructive",
        bg: "bg-destructive",
      };
    case RabbitMQAlertSeverity.MEDIUM:
      return {
        border: "border-l-warning",
        text: "text-warning",
        bg: "bg-warning",
      };
    case RabbitMQAlertSeverity.LOW:
      return { border: "border-l-info", text: "text-info", bg: "bg-info" };
    default:
      return {
        border: "border-l-muted-foreground",
        text: "text-muted-foreground",
        bg: "bg-muted-foreground",
      };
  }
};
