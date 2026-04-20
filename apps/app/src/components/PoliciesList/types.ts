export interface PolicyListItem {
  vhost: string;
  name: string;
  pattern: string;
  "apply-to": "queues" | "exchanges" | "all";
  definition: Record<string, unknown>;
  priority: number;
}
