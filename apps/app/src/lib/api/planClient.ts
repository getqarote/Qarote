/**
 * Plan API Client
 * Handles all plan-related API operations
 */

import type { UserPlan } from "@/types/plans";

export interface CurrentPlanResponse {
  user: {
    id: string;
    email: string;
    plan: UserPlan;
    subscriptionStatus: string | null;
    trialEnd: string | null;
  };
  workspace: {
    id: string;
    name: string;
  };
  planFeatures: {
    // Core permissions
    canAddQueue: boolean;
    canSendMessages: boolean;
    canAddServer: boolean;
    canAddExchange: boolean;
    canAddVirtualHost: boolean;
    canAddRabbitMQUser: boolean;
    canInviteUsers: boolean;
    // Limits (null = unlimited)
    maxServers: number | null;
    maxWorkspaces: number | null;
    maxUsers: number | null;
    maxInvitations: number | null;
    // Support features
    hasPrioritySupport: boolean;
    // Display features
    hasAdvancedAnalytics: boolean;
    hasAlerts: boolean;
    isPopular: boolean;
    // RabbitMQ Version Support
    supportedRabbitMqVersions: string[];
    // Pricing (in cents)
    monthlyPrice: number;
    yearlyPrice: number;
    // Display information
    displayName: string;
    description: string;
    color: string;
    // Feature descriptions for UI
    featureDescriptions: string[];
  };
  usage: {
    users: {
      current: number;
      limit: number | null;
      percentage: number;
      canAdd: boolean;
      canSend: boolean;
    };
    servers: {
      current: number;
      limit: number | null;
      percentage: number;
      canAdd: boolean;
      canSend: boolean;
    };
    workspaces: {
      current: number;
      limit: number | null;
      percentage: number;
      canAdd: boolean;
      canSend: boolean;
    };
  };
  warnings: {
    users: boolean;
    servers: boolean;
    workspaces: boolean;
  };
  approachingLimits: boolean;
}
