import { createContext } from "react";

import type { Workspace } from "@/lib/api/workspaceClient";

// Extended workspace interface to handle the full API response
interface ExtendedWorkspace extends Workspace {
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
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

export type { ExtendedWorkspace, WorkspaceContextType };
