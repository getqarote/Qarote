import { z } from "zod";

/**
 * All valid RabbitMQ alert metric types supported by the broker.
 * The form picker exposes a curated subset; validation accepts all.
 */
const ALERT_TYPES = [
  "QUEUE_DEPTH",
  "MESSAGE_RATE",
  "UNACKED_MESSAGES",
  "CONSUMER_COUNT",
  "CONSUMER_UTILIZATION",
  "MEMORY_USAGE",
  "DISK_USAGE",
  "CONNECTION_COUNT",
  "CHANNEL_COUNT",
  "FILE_DESCRIPTOR_USAGE",
  "NODE_DOWN",
  "EXCHANGE_ERROR",
  "SOCKET_USAGE",
  "PROCESS_USAGE",
  "RUN_QUEUE_LENGTH",
  "CONNECTION_CHURN_RATE",
  "CHANNEL_CHURN_RATE",
  "QUEUE_CHURN_RATE",
  "MEMORY_ALARM",
  "DISK_ALARM",
  "DLQ_MESSAGES",
  "NO_CONSUMERS",
] as const;

const ALERT_COMPARISON_OPERATORS = [
  "GREATER_THAN",
  "LESS_THAN",
  "EQUALS",
  "NOT_EQUALS",
] as const;

const ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

/** Percentage-based metrics where the threshold is 0–100. */
export const ALERT_PERCENTAGE_TYPES = new Set([
  "MEMORY_USAGE",
  "DISK_USAGE",
  "CONSUMER_UTILIZATION",
  "FILE_DESCRIPTOR_USAGE",
  "SOCKET_USAGE",
  "PROCESS_USAGE",
] as const);

/**
 * Boolean alert types — the condition is a broker-level binary state (alarm on/off,
 * consumers present or not). Threshold and operator fields are fixed and hidden in the
 * form UI; the user can only configure severity.
 */
export const ALERT_BOOLEAN_TYPES = new Set([
  "MEMORY_ALARM",
  "DISK_ALARM",
  "NO_CONSUMERS",
] as const);

export const alertRuleSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  description: z.string().max(1024).optional(),
  type: z.enum(ALERT_TYPES),
  // coerce handles the HTML <input type="number"> string→number conversion
  threshold: z.coerce
    .number()
    .min(0, "Threshold must be 0 or greater")
    .max(1_000_000, "Threshold is unrealistically large"),
  operator: z.enum(ALERT_COMPARISON_OPERATORS),
  severity: z.enum(ALERT_SEVERITIES),
  enabled: z.boolean().default(true),
});

export type AlertRuleFormValues = z.infer<typeof alertRuleSchema>;
