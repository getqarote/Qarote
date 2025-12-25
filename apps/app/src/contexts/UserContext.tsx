import React, { useCallback } from "react";

import { useCurrentPlan } from "@/hooks/queries/usePlans";

import { UserPlan } from "@/types/plans";

import { useAuth } from "./AuthContextDefinition";
import { UserContext, type UserContextType } from "./UserContextDefinition";

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const {
    data: planResponse,
    isLoading: isPlanLoading,
    error: planQueryError,
    refetch: refetchPlan,
  } = useCurrentPlan();

  const planData = planResponse || null;
  const planError = planQueryError
    ? planQueryError instanceof Error
      ? planQueryError.message
      : "Failed to fetch plan data"
    : null;

  const fetchPlan = useCallback(async () => {
    await refetchPlan();
  }, [refetchPlan]);

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
    canConfigureAlerts,
    approachingLimits,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
