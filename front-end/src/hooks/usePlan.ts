/**
 * Plan Hooks
 * Custom hooks for accessing plan data and features
 */

import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Hook to get current user's plan data with usage information
 * This provides real-time plan features and usage limits
 */
export function usePlanData() {
  const { planData, isPlanLoading, planError, refetchPlan } = useWorkspace();

  return {
    planData,
    isLoading: isPlanLoading,
    error: planError,
    refetch: refetchPlan,

    // Convenience getters
    planFeatures: planData?.planFeatures,
    usage: planData?.usage,
    warnings: planData?.warnings,
    approachingLimits: planData?.approachingLimits || false,
    workspace: planData?.workspace,
  };
}

/**
 * Utility hook to check specific permissions
 */
export function usePlanPermissions() {
  const { planData } = usePlanData();

  if (!planData) {
    return {
      canAddServer: false,
      canAddQueue: false,
      canSendMessages: false,
      canExportData: false,
      canAccessRouting: false,
      hasAdvancedMetrics: false,
      hasAdvancedAlerts: false,
      hasPrioritySupport: false,
    };
  }

  return {
    canAddServer: planData.usage.servers.canAdd,
    canAddQueue: planData.usage.queues.canAdd,
    canSendMessages: planData.usage.messages.canSend,
    canExportData: planData.planFeatures.canExportData,
    canAccessRouting: planData.planFeatures.canAccessRouting,
    hasAdvancedMetrics: planData.planFeatures.hasAdvancedMetrics,
    hasAdvancedAlerts: planData.planFeatures.hasAdvancedAlerts,
    hasPrioritySupport: planData.planFeatures.hasPrioritySupport,
  };
}

/**
 * Utility hook to check memory feature permissions
 */
export function useMemoryPermissions() {
  const { planData } = usePlanData();

  if (!planData) {
    return {
      canViewBasicMemoryMetrics: false,
      canViewAdvancedMemoryMetrics: false,
      canViewExpertMemoryMetrics: false,
      canViewMemoryTrends: false,
      canViewMemoryOptimization: false,
    };
  }

  return {
    canViewBasicMemoryMetrics: planData.planFeatures.canViewBasicMemoryMetrics,
    canViewAdvancedMemoryMetrics:
      planData.planFeatures.canViewAdvancedMemoryMetrics,
    canViewExpertMemoryMetrics:
      planData.planFeatures.canViewExpertMemoryMetrics,
    canViewMemoryTrends: planData.planFeatures.canViewMemoryTrends,
    canViewMemoryOptimization: planData.planFeatures.canViewMemoryOptimization,
  };
}

/**
 * Utility hook to get usage statistics
 */
export function useUsageStats() {
  const { planData } = usePlanData();

  if (!planData) {
    return {
      users: { current: 0, limit: 1, percentage: 0, canAdd: false },
      servers: { current: 0, limit: 1, percentage: 0, canAdd: false },
      queues: { current: 0, limit: 1, percentage: 0, canAdd: false },
      messages: { current: 0, limit: 0, percentage: 0, canSend: false },
    };
  }

  return planData.usage;
}

/**
 * Hook to get plan display information
 */
export function usePlanDisplay() {
  const { planData } = usePlanData();

  if (!planData) {
    return {
      displayName: "Free",
      description: "Loading...",
      color: "text-white bg-gray-600",
      monthlyPrice: 0,
      yearlyPrice: 0,
      featureDescriptions: [],
    };
  }

  const { planFeatures } = planData;
  return {
    displayName: planFeatures.displayName,
    description: planFeatures.description,
    color: planFeatures.color,
    monthlyPrice: planFeatures.monthlyPrice,
    yearlyPrice: planFeatures.yearlyPrice,
    featureDescriptions: planFeatures.featureDescriptions,
  };
}
