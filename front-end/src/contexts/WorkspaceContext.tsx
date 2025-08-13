import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { apiClient, type CurrentPlanResponse } from "@/lib/api";
import type { Workspace } from "@/lib/api/workspaceClient";
import { WorkspacePlan } from "@/types/plans";
import { setSentryContext } from "@/lib/sentry";
import logger from "../lib/logger";

// Extended workspace interface to handle the full API response
interface ExtendedWorkspace extends Workspace {
  storageMode?: string;
  retentionDays?: number;
  encryptData?: boolean;
  autoDelete?: boolean;
  consentGiven?: boolean;
  consentDate?: string;
  _count?: {
    users: number;
    servers: number;
  };
}

interface WorkspaceContextType {
  workspace: ExtendedWorkspace | null;
  planData: CurrentPlanResponse | null;
  isLoading: boolean;
  isPlanLoading: boolean;
  error: string | null;
  planError: string | null;
  refetch: () => Promise<void>;
  refetchPlan: () => Promise<void>;
  workspacePlan: WorkspacePlan;
  // Convenience getters for common plan operations
  canAddServer: boolean;
  canAddQueue: boolean;
  canSendMessages: boolean;
  canExportData: boolean;
  canAccessRouting: boolean;
  canConfigureAlerts: boolean;
  canManageQueues: boolean;
  approachingLimits: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};

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
    if (!isAuthenticated || !user) {
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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch workspace";
      setError(errorMessage);
      logger.error("Failed to fetch workspace:", err);
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
  useEffect(() => {
    if (isAuthenticated && user) {
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
  const canAddQueue = planData?.usage.queues.canAdd ?? false;
  const canSendMessages = planData?.usage.messages.canSend ?? false;
  const canExportData = planData?.planFeatures.canExportData ?? false;
  const canAccessRouting = planData?.planFeatures.canAccessRouting ?? false;
  const canConfigureAlerts = planData?.planFeatures.hasAdvancedAlerts ?? false;
  const canManageQueues = workspacePlan !== WorkspacePlan.FREE;
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
    canExportData,
    canAccessRouting,
    canConfigureAlerts,
    canManageQueues,
    approachingLimits,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
