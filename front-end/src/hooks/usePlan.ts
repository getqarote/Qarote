/**
 * Plan Hooks
 * Custom hooks for accessing plan data and features
 */

import { useUser } from "@/hooks/useUser";

/**
 * Hook to get current user's plan data with usage information
 * This provides real-time plan features and usage limits
 */
export function usePlanData() {
  const { user, planData, isLoading, planError, refetchPlan } = useUser();

  return {
    user,
    planData,
    isLoading,
    error: planError,
    refetch: refetchPlan,

    // Convenience getters
    planFeatures: planData?.planFeatures,
    usage: planData?.usage,
    warnings: planData?.warnings,
    approachingLimits: planData?.approachingLimits || false,
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
      canAddExchange: false,
      canAddVirtualHost: false,
      canAddRabbitMQUser: false,
      canInviteUsers: false,
      hasPrioritySupport: false,
    };
  }

  return {
    canAddServer: planData.planFeatures.canAddServer,
    canAddQueue: planData.planFeatures.canAddQueue,
    canSendMessages: planData.planFeatures.canSendMessages,
    canAddExchange: planData.planFeatures.canAddExchange,
    canAddVirtualHost: planData.planFeatures.canAddVirtualHost,
    canAddRabbitMQUser: planData.planFeatures.canAddRabbitMQUser,
    canInviteUsers: planData.planFeatures.canInviteUsers,
    hasPrioritySupport: planData.planFeatures.hasPrioritySupport,
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
      workspaces: { current: 0, limit: 1, percentage: 0, canAdd: false },
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
