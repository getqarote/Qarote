/**
 * Shared types for Message Tracing (Action 6).
 * Canonical representation of a trace event on the frontend.
 */

export type TraceDirection = "publish" | "deliver";

export interface MessageTraceEvent {
  id: string;
  serverId: string;
  vhost: string;
  exchange: string;
  routingKey: string;
  queueName: string | null;
  payloadBytes: number;
  contentType: string | null;
  messageId: string | null;
  direction: TraceDirection;
  /** ISO 8601 string — from broker timestamp, not insertion time. */
  timestamp: string;
}

export interface VhostTracingStatus {
  name: string;
  tracing: boolean;
}

export interface TraceFilters {
  vhost?: string;
  queueName?: string;
  exchange?: string;
  routingKey?: string;
  direction?: TraceDirection;
}
