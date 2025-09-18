import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { apiClient, type CurrentPlanResponse } from "@/lib/api";
import type { Workspace } from "@/lib/api/workspaceClient";
import { WorkspacePlan } from "@/types/plans";
import { setSentryContext } from "@/lib/sentry";
import logger from "../lib/logger";
import {
  WorkspaceContext,
  type WorkspaceContextType,
  type ExtendedWorkspace,
} from "./WorkspaceContextDefinition";

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  children,
}) => {
  const [workspace, setWorkspace] = useState<ExtendedWorkspace | null>(null);
  const [planData, setPlanData] = useState<CurrentPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  const fetchWorkspace = useCallback(async () => {
    if (!isAuthenticated || !user || !user.workspaceId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getCurrentWorkspace();
      setWorkspace(response.workspace);

      // Set Sentry workspace context
      setSentryContext("workspace", {
        id: response.workspace.id,
        name: response.workspace.name,
        plan: response.workspace.plan,
        createdAt: response.workspace.createdAt,
      });
    } catch (err) {
      // If user doesn't have a workspace (404), this is not an error
      if (
        err instanceof Error &&
        err.message.includes("No workspace assigned")
      ) {
        logger.debug("User has no workspace assigned yet");
        setWorkspace(null);
        setError(null);
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch workspace";
        setError(errorMessage);
        logger.error("Failed to fetch workspace:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

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

  // Fetch both workspace and plan data when user authenticates
  // Only fetch if user has a workspaceId (meaning they already have a workspace)
  useEffect(() => {
    if (isAuthenticated && user && user.workspaceId) {
      fetchWorkspace();
      fetchPlan();
    }
  }, [isAuthenticated, user, fetchWorkspace, fetchPlan]);

  // Derive values from plan data or workspace
  const workspacePlan =
    planData?.workspace.plan ||
    (workspace?.plan as WorkspacePlan) ||
    WorkspacePlan.FREE;

  // Convenience getters for common plan operations
  const canAddServer = planData?.usage.servers.canAdd ?? true;
  const canAddQueue = planData?.planFeatures.canAddQueue ?? false;
  const canSendMessages = planData?.planFeatures.canSendMessages ?? false;
  const canAddExchange = planData?.planFeatures.canAddExchange ?? false;
  const canAddVirtualHost = planData?.planFeatures.canAddVirtualHost ?? false;
  const canAddRabbitMQUser = planData?.planFeatures.canAddRabbitMQUser ?? false;
  const canCreateWorkspace =
    planData?.usage.workspaces?.canAdd ?? workspacePlan !== WorkspacePlan.FREE;
  const canManageQueues = workspacePlan !== WorkspacePlan.FREE;
  const canConfigureAlerts = workspacePlan !== WorkspacePlan.FREE;
  const approachingLimits = planData?.approachingLimits ?? false;

  const value: WorkspaceContextType = {
    workspace,
    planData,
    isLoading,
    isPlanLoading,
    error,
    planError,
    refetch: fetchWorkspace,
    refetchPlan: fetchPlan,
    workspacePlan,
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

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
