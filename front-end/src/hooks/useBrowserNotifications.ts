import { useEffect, useRef, useCallback } from "react";
import { AlertSeverity } from "@/types/alerts";
import type { RabbitMQAlert } from "@/types/alerts";
import logger from "@/lib/logger";

interface BrowserNotificationOptions {
  enabled: boolean;
  severities: string[];
}

/**
 * Hook to manage browser notifications for alerts
 * Handles permission requests and shows notifications for new alerts
 */
export function useBrowserNotifications(
  alerts: RabbitMQAlert[] | undefined,
  options: BrowserNotificationOptions
) {
  const previousAlertIdsRef = useRef<Set<string>>(new Set());
  const permissionRequestedRef = useRef(false);

  // Request notification permission when enabled
  useEffect(() => {
    if (!options.enabled || permissionRequestedRef.current) {
      return;
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        permissionRequestedRef.current = true;
        if (permission === "granted") {
          logger.log("Browser notifications enabled");
        } else {
          logger.log("Browser notifications denied");
        }
      });
    } else if (Notification.permission === "granted") {
      permissionRequestedRef.current = true;
    }
  }, [options.enabled]);

  // Show notification for a new alert
  const showNotification = useCallback(
    (alert: RabbitMQAlert) => {
      // Check if notifications are enabled and permission is granted
      if (
        !options.enabled ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      // Check if this severity should trigger a notification
      if (!options.severities.includes(alert.severity)) {
        return;
      }

      // Determine notification icon and badge based on severity
      const icon = "/favicon.ico"; // Default icon
      const badge = "/favicon.ico";
      const tag = `alert-${alert.severity}`;

      // Create notification
      const notification = new Notification(alert.title, {
        body: alert.description,
        icon,
        badge,
        tag, // Use tag to replace notifications of the same type
        requireInteraction: alert.severity === AlertSeverity.CRITICAL, // Critical alerts require interaction
        data: {
          alertId: alert.id,
          serverId: alert.serverId,
          severity: alert.severity,
        },
      });

      // Handle notification click - focus the window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds for non-critical alerts
      if (alert.severity !== AlertSeverity.CRITICAL) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    },
    [options.enabled, options.severities]
  );

  // Detect new alerts and show notifications
  useEffect(() => {
    if (!alerts || !options.enabled) {
      return;
    }

    const currentAlertIds = new Set(alerts.map((alert) => alert.id));
    const previousAlertIds = previousAlertIdsRef.current;

    // Find new alerts (alerts that weren't in the previous set)
    const newAlerts = alerts.filter((alert) => !previousAlertIds.has(alert.id));

    // Show notifications for new alerts
    newAlerts.forEach((alert) => {
      showNotification(alert);
    });

    // Update the previous alert IDs
    previousAlertIdsRef.current = currentAlertIds;
  }, [alerts, options.enabled, showNotification]);

  return {
    permission: "Notification" in window ? Notification.permission : "denied",
    requestPermission: useCallback(async () => {
      if (!("Notification" in window)) {
        return "unsupported";
      }
      const permission = await Notification.requestPermission();
      permissionRequestedRef.current = true;
      return permission;
    }, []),
  };
}
