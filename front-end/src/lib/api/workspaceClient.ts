/**
 * Workspace API Client
 * Handles workspace data management
 */

import { BaseApiClient } from "./baseClient";

export interface Workspace {
  id: string;
  name: string;
  contactEmail: string;
  logoUrl?: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceApiClient extends BaseApiClient {
  async getCurrentWorkspace(): Promise<{
    workspace: Workspace;
  }> {
    return this.request("/workspaces/current");
  }

  async exportWorkspaceData(WorkspaceId: string): Promise<Blob> {
    return this.requestBlob(`/workspaces/${WorkspaceId}/export`, {
      method: "GET",
    });
  }

  async deleteWorkspaceData(WorkspaceId: string): Promise<{
    message: string;
    deletedAt: string;
    deletedBy: string;
  }> {
    return this.request(`/workspaces/${WorkspaceId}/data`, {
      method: "DELETE",
    });
  }
}
