/**
 * Workspace API Client
 * Handles workspace data management
 */

import { BaseApiClient } from "./baseClient";
// import { UserPlan } from "@/types/plans";

export interface Workspace {
  id: string;
  name: string;
  contactEmail: string;
  logoUrl?: string;
  tags?: string[];
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  contactEmail?: string;
  tags?: string[];
  // plan: UserPlan;
  isOwner: boolean;
  userRole: string;
  _count: {
    users: number;
    servers: number;
  };
  createdAt: string;
}

export interface WorkspaceCreationInfo {
  // currentPlan: UserPlan;
  ownedWorkspaceCount: number;
  maxWorkspaces: number | null;
  canCreateWorkspace: boolean;
  planFeatures: {
    displayName: string;
    description: string;
    maxWorkspaces: number | null;
  };
}

export class WorkspaceApiClient extends BaseApiClient {
  async getCurrentWorkspace(): Promise<{
    workspace: Workspace;
  }> {
    return this.request("/workspaces/current");
  }

  // Workspace management methods
  async getUserWorkspaces(): Promise<{ workspaces: WorkspaceInfo[] }> {
    return this.request("/workspaces/workspaces");
  }

  async getWorkspaceCreationInfo(): Promise<WorkspaceCreationInfo> {
    return this.request("/workspaces/workspaces/creation-info");
  }

  async createWorkspace(data: {
    name: string;
    contactEmail?: string;
    tags?: string[];
  }): Promise<{ workspace: WorkspaceInfo }> {
    return this.request("/workspaces/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWorkspace(
    id: string,
    data: { name: string; contactEmail?: string; tags?: string[] }
  ): Promise<{ workspace: WorkspaceInfo }> {
    return this.request(`/workspaces/workspaces/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteWorkspace(id: string): Promise<{ message: string }> {
    return this.request(`/workspaces/workspaces/${id}`, {
      method: "DELETE",
    });
  }

  async switchWorkspace(id: string): Promise<{ message: string }> {
    return this.request(`/workspaces/workspaces/${id}/switch`, {
      method: "POST",
    });
  }
}
