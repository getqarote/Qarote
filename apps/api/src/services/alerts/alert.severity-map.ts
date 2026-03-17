import { AlertSeverity } from "./alert.interfaces";

import { AlertSeverity as PrismaAlertSeverity } from "@/generated/prisma/client";

/**
 * Maps the internal RabbitMQ alert severity (lowercase strings from alert.interfaces.ts)
 * to the Prisma AlertSeverity enum used in the unified Alert table.
 *
 * Internal: "critical" | "warning" | "info"
 * Prisma:   CRITICAL   | MEDIUM    | INFO
 *
 * warning → MEDIUM (not HIGH) to avoid inflating severity of routine conditions.
 */
export function toPrismaAlertSeverity(
  severity: AlertSeverity
): PrismaAlertSeverity {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return PrismaAlertSeverity.CRITICAL;
    case AlertSeverity.WARNING:
      return PrismaAlertSeverity.MEDIUM;
    case AlertSeverity.INFO:
      return PrismaAlertSeverity.INFO;
  }
}
