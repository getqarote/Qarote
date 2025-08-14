/**
 * Plan Types
 * Essential plan types and enums used throughout the application
 * All plan logic and features are fetched from the backend API
 */

// Plan enum - keep in sync with backend
export enum WorkspacePlan {
  FREE = "FREE",
  DEVELOPER = "DEVELOPER",
  ENTERPRISE = "ENTERPRISE",
}

// Basic plan features interface for API types
export interface PlanFeatures {
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canAddExchange: boolean;
  canAddVirtualHost: boolean;
  canAddRabbitMQUser: boolean;
  canInviteUsers: boolean;
  maxServers?: number;
  maxWorkspaces?: number;
  maxUsers?: number;
  hasCommunitySupport: boolean;
  hasPrioritySupport: boolean;
  hasEmailAlerts: boolean;

  // Display information
  displayName: string;
  description: string;
  color: string;

  // Pricing
  monthlyPrice: number;
  yearlyPrice: number;
  userCostPerMonth?: number;

  // Feature descriptions
  featureDescriptions: string[];
}

// Usage information interface
export interface PlanUsage {
  users: {
    current: number;
    limit?: number;
    percentage: number;
    canAdd: boolean;
  };
  servers: {
    current: number;
    limit?: number;
    percentage: number;
    canAdd: boolean;
  };
  workspaces: {
    current: number;
    limit?: number;
    percentage: number;
    canAdd: boolean;
  };
}

export interface PlanWarnings {
  users: boolean;
  servers: boolean;
  workspaces: boolean;
}

export interface CurrentPlanInfo {
  workspace: {
    id: string;
    name: string;
    plan: WorkspacePlan;
  };
  planFeatures: PlanFeatures;
  usage: PlanUsage;
  warnings: PlanWarnings;
  approachingLimits: boolean;
}
