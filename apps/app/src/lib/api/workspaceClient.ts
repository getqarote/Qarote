/**
 * Workspace API Client
 * Handles workspace data management
 */

export interface Workspace {
  id: string;
  name: string;
  contactEmail: string;
  logoUrl?: string;
  tags?: string[];
  plan: string;
  ownerId?: string;
  unackedWarnThreshold?: number;
  vhostThresholds?: Record<string, number>;
  traceRetentionHours?: number;
  createdAt: string;
  updatedAt: string;
}
