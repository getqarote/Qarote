/**
 * Profile page utility functions and types
 */

export interface ProfileFormState {
  firstName: string;
  lastName: string;
}

export interface WorkspaceFormState {
  name: string;
  contactEmail: string;
  tags: string[];
  unackedWarnThreshold: number;
  /**
   * Trace retention window in hours. Server validates the value against
   * the org's plan (FREE: locked at 24h, DEVELOPER: ≤168h, ENTERPRISE: ≤720h).
   * Optional — undefined means "inherit the plan's effective default."
   * The form input falls back to the effective retention so a paid
   * workspace that hasn't customised the field shows its plan's max
   * instead of a hardcoded 24.
   */
  traceRetentionHours?: number;
}

export interface InviteFormState {
  emails: string[];
  role: "ADMIN" | "MEMBER";
}

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
