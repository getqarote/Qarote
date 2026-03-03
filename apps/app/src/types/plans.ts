/**
 * Plan Types
 * Essential plan types and enums used throughout the application
 * All plan logic and features are fetched from the backend API
 */

// Plan enum - keep in sync with backend
export enum UserPlan {
  FREE = "FREE",
  DEVELOPER = "DEVELOPER",
  ENTERPRISE = "ENTERPRISE",
}

export function getPlanDisplayName(plan: UserPlan): string {
  switch (plan) {
    case UserPlan.FREE:
      return "Free";
    case UserPlan.DEVELOPER:
      return "Developer";
    case UserPlan.ENTERPRISE:
      return "Enterprise";
    default:
      return "Unknown";
  }
}
