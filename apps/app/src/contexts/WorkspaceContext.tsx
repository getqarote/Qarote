import React, { useCallback, useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import { setSentryContext } from "@/lib/sentry";

import { useCurrentWorkspace } from "@/hooks/queries/useWorkspaceApi";

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

  const {
    data,
    isLoading: queryLoading,
    error: queryError,
    refetch,
  } = useCurrentWorkspace();

  const fetchWorkspace = useCallback(async () => {
    if (!isAuthenticated || !user || !user.workspaceId) {
      return;
    }

    await refetch();
  }, [isAuthenticated, user, refetch]);

  // Update workspace state when query data changes
  useEffect(() => {
    if (data?.workspace) {
      setWorkspace(data.workspace);

      // Set Sentry workspace context
      setSentryContext("workspace", {
        id: data.workspace.id,
        name: data.workspace.name,
        createdAt: data.workspace.createdAt,
      });
    } else if (queryError) {
      // If user doesn't have a workspace (404), this is not an error
      if (
        queryError instanceof Error &&
        queryError.message.includes("No workspace assigned")
      ) {
        logger.debug("User has no workspace assigned yet");
        setWorkspace(null);
        setError(null);
      } else {
        const errorMessage =
          queryError instanceof Error
            ? queryError.message
            : "Failed to fetch workspace";
        setError(errorMessage);
        logger.error("Failed to fetch workspace:", queryError);
      }
    }
  }, [data, queryError]);

  useEffect(() => {
    setIsLoading(queryLoading);
  }, [queryLoading]);

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
