/**
 * Shared types for the portal app
 */

// User type - matches the User type from the API
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified: boolean;
}

// License type - matches the License type from the API
export interface License {
  id: string;
  licenseKey: string;
  tier: "FREE" | "DEVELOPER" | "ENTERPRISE";
  expiresAt: Date;
  customerEmail: string;
  workspaceId: string | null;
  lastValidatedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
