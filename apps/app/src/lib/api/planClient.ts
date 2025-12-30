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
    // Limits
    maxServers?: number;
    maxWorkspaces?: number;
    maxUsers?: number;
    maxInvitations?: number;
    // Support features
    hasCommunitySupport: boolean;
    hasPrioritySupport: boolean;
    hasEmailAlerts: boolean;
    // RabbitMQ Version Support
    supportedRabbitMqVersions: string[];
    // Pricing (in cents)
    monthlyPrice: number;
    yearlyPrice: number;
    userCostPerMonth?: number;
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
      limit?: number;
      percentage: number;
      canAdd?: boolean;
      canSend?: boolean;
    };
    servers: {
      current: number;
      limit?: number;
      percentage: number;
      canAdd?: boolean;
      canSend?: boolean;
    };
    workspaces: {
      current: number;
      limit?: number;
      percentage: number;
      canAdd?: boolean;
      canSend?: boolean;
    };
  };
  warnings: {
    users: boolean;
    servers: boolean;
    workspaces: boolean;
  };
  approachingLimits: boolean;
}
