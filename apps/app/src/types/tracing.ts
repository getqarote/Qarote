/**
 * Shared types for Message Tracing (Action 6).
 * Canonical representation of a trace event on the frontend.
 */

export interface VhostTracingStatus {
  name: string;
  tracing: boolean;
}
