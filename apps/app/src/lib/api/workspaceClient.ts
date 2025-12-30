/**
 * Workspace API Client
 * Handles workspace data management
 */

export interface Workspace {
  id: string;
  name: string;
  contactEmail: string;
  logoUrl?: string;
  tags?: string[];
  plan: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}
