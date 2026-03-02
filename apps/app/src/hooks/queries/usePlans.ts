import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

/**
 * Plan-related hooks
 * Handles plan information and current plan details
 */

// Get all available plans
export const useAllPlans = () => {
  const { isAuthenticated } = useAuth();

  return trpc.workspace.plan.getAllPlans.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes - plans don't change often
  });
};

// Get current plan
export const useCurrentPlan = () => {
  const { isAuthenticated } = useAuth();

  return trpc.workspace.plan.getCurrentPlan.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
};
