/**
 * Plan API Client
 * Handles all plan-related API operations
 */

import { BaseApiClient } from "./baseClient";
import type { WorkspacePlan } from "@/types/plans";

export interface PlanFeatures {
  // Feature flags
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  canAccessRouting: boolean;
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;

  // Memory features
  canViewBasicMemoryMetrics: boolean;
  canViewAdvancedMemoryMetrics: boolean;
  canViewExpertMemoryMetrics: boolean;
  canViewMemoryTrends: boolean;
  canViewMemoryOptimization: boolean;

  // Limits
  maxServers?: number;
  maxQueues?: number;
  maxUsers?: number;
  maxMessagesPerMonth?: number;

  // Display information
  displayName: string;
  description: string;
  color: string;

  // Pricing (in cents)
  monthlyPrice: number;
  yearlyPrice: number;

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
  queues: UsageInfo;
  messages: UsageInfo;
}

export interface PlanWarnings {
  users: boolean;
  servers: boolean;
  queues: boolean;
  messages: boolean;
}

export interface CurrentPlanResponse {
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

export interface AllPlansResponse {
  plans: Array<
    {
      plan: WorkspacePlan;
    } & PlanFeatures
  >;
}

export interface SpecificPlanResponse {
  plan: WorkspacePlan;
  // All plan features will be spread here
  displayName: string;
  description: string;
  color: string;
  monthlyPrice: number;
  yearlyPrice: number;
  featureDescriptions: string[];
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  canAccessRouting: boolean;
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;
  canViewBasicMemoryMetrics: boolean;
  canViewAdvancedMemoryMetrics: boolean;
  canViewExpertMemoryMetrics: boolean;
  canViewMemoryTrends: boolean;
  canViewMemoryOptimization: boolean;
  maxServers?: number;
  maxQueues?: number;
  maxUsers?: number;
  maxMessagesPerMonth?: number;
}

export class PlanApiClient extends BaseApiClient {
  /**
   * Get all available plans with their features
   */
  async getAllPlans(): Promise<AllPlansResponse> {
    return this.request<AllPlansResponse>("/plans");
  }

  /**
   * Get current user's plan features and usage
   */
  async getCurrentPlan(): Promise<CurrentPlanResponse> {
    return this.request<CurrentPlanResponse>("/plans/current");
  }

  /**
   * Get specific plan features
   */
  async getPlan(plan: WorkspacePlan): Promise<SpecificPlanResponse> {
    return this.request<SpecificPlanResponse>(`/plans/${plan}`);
  }
}
