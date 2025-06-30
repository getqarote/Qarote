/**
 * Plan Types
 * Essential plan types and enums used throughout the application
 * All plan logic and features are fetched from the backend API
 */

// Plan enum - keep in sync with backend
export enum WorkspacePlan {
  FREE = "FREE",
  DEVELOPER = "DEVELOPER",
  STARTUP = "STARTUP",
  BUSINESS = "BUSINESS",
}

// Basic plan features interface for API types
export interface PlanFeatures {
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  canAccessRouting: boolean;
  maxQueues?: number;
  maxServers?: number;
  maxUsers?: number;
  maxMessagesPerMonth?: number;
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;

  // Memory Features
  canViewBasicMemoryMetrics: boolean;
  canViewAdvancedMemoryMetrics: boolean;
  canViewExpertMemoryMetrics: boolean;
  canViewMemoryTrends: boolean;
  canViewMemoryOptimization: boolean;

  // Display information
  displayName: string;
  description: string;
  color: string;

  // Pricing
  monthlyPrice: number;
  yearlyPrice: number;

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
  queues: {
    current: number;
    limit?: number;
    percentage: number;
    canAdd: boolean;
  };
  messages: {
    current: number;
    limit?: number;
    percentage: number;
    canSend: boolean;
  };
}

export interface PlanWarnings {
  users: boolean;
  servers: boolean;
  queues: boolean;
  messages: boolean;
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
