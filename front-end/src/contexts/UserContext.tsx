import React, { useEffect, useState, useCallback } from "react";
import { apiClient, type CurrentPlanResponse } from "@/lib/api";
import { UserPlan } from "@/types/plans";
import logger from "../lib/logger";
import { UserContext, type UserContextType } from "./UserContextDefinition";
import { useAuth } from "./AuthContextDefinition";

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [planData, setPlanData] = useState<CurrentPlanResponse | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  const fetchPlan = useCallback(async () => {
    if (!isAuthenticated || !user?.workspaceId) {
      return;
    }

    setIsPlanLoading(true);
    setPlanError(null);

    try {
      const response = await apiClient.getCurrentPlan();
      setPlanData(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch plan data";
      setPlanError(errorMessage);
      logger.error("Failed to fetch plan data:", err);
    } finally {
      setIsPlanLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch plan data when user authenticates
  // Only fetch if user has a workspaceId (meaning they already have a workspace)
  useEffect(() => {
    if (isAuthenticated && user && user.workspaceId) {
      fetchPlan();
    }
  }, [isAuthenticated, user, fetchPlan]);

  // Derive values from plan data or user
  const userPlan = planData?.user?.plan || UserPlan.FREE;

  // Convenience getters for common plan operations
  const canAddServer = planData?.usage.servers.canAdd ?? true;
  const canAddQueue = planData?.planFeatures.canAddQueue ?? false;
  const canSendMessages = planData?.planFeatures.canSendMessages ?? false;
  const canAddExchange = planData?.planFeatures.canAddExchange ?? false;
  const canAddVirtualHost = planData?.planFeatures.canAddVirtualHost ?? false;
  const canAddRabbitMQUser = planData?.planFeatures.canAddRabbitMQUser ?? false;
  const canCreateWorkspace =
    planData?.usage.workspaces?.canAdd ?? userPlan !== UserPlan.FREE;
  const canManageQueues = userPlan !== UserPlan.FREE;
  const canConfigureAlerts = userPlan !== UserPlan.FREE;
  const approachingLimits = planData?.approachingLimits ?? false;

  const value: UserContextType = {
    user,
    isLoading: isPlanLoading, // user already loaded, so we don't need to load it again
    planData,
    planError,
    refetchPlan: fetchPlan,
    userPlan,
    canAddServer,
    canAddQueue,
    canSendMessages,
    canAddExchange,
    canAddVirtualHost,
    canAddRabbitMQUser,
    canCreateWorkspace,
    canManageQueues,
    canConfigureAlerts,
    approachingLimits,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
