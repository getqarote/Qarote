import React, { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api";
import { logger } from "@/lib/logger";
import { setSentryContext } from "@/lib/sentry";

import { useAuth } from "./AuthContextDefinition";
import {
  type ExtendedWorkspace,
  WorkspaceContext,
  type WorkspaceContextType,
} from "./WorkspaceContextDefinition";

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  children,
}) => {
  const [workspace, setWorkspace] = useState<ExtendedWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch workspace data when user authenticates
  // Only fetch if user has a workspaceId (meaning they already have a workspace)
  useEffect(() => {
    if (isAuthenticated && user && user.workspaceId) {
      fetchWorkspace();
    }
  }, [isAuthenticated, user, fetchWorkspace]);

  const value: WorkspaceContextType = {
    workspace,
    isLoading,
    error,
    refetch: fetchWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
