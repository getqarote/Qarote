/**
 * Plan API Client
 * Handles all plan-related API operations
 */

import { BaseApiClient } from "./baseClient";
import type { UserPlan } from "@/types/plans";

export interface PlanFeatures {
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
}

export interface UsageInfo {
  current: number;
  limit?: number;
  percentage: number;
  canAdd?: boolean;
  canSend?: boolean;
}

export interface PlanUsage {
  users: UsageInfo;
  servers: UsageInfo;
  workspaces: UsageInfo;
}

export interface PlanWarnings {
  users: boolean;
  servers: boolean;
  workspaces: boolean;
}

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
  planFeatures: PlanFeatures;
  usage: PlanUsage;
  warnings: PlanWarnings;
  approachingLimits: boolean;
}

export interface AllPlansResponse {
  plans: Array<
    {
      plan: UserPlan;
    } & PlanFeatures
  >;
}

export class PlanApiClient extends BaseApiClient {
  /**
   * Get all available plans with their features
   */
  async getAllPlans(): Promise<AllPlansResponse> {
    return this.request<AllPlansResponse>("/workspaces/plans");
  }

  /**
   * Get current user's plan features and usage
   */
  async getCurrentPlan(): Promise<CurrentPlanResponse> {
    return this.request<CurrentPlanResponse>("/workspaces/current/plan");
  }
}
