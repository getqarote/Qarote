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
}

// Legacy type alias for backwards compatibility
export type CompanyFormState = WorkspaceFormState;

export interface InviteFormState {
  email: string;
  role: "ADMIN" | "USER";
  message?: string;
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

export const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "bg-red-100 text-red-800";
    case "USER":
      return "bg-blue-100 text-blue-800";
    case "READONLY":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getPlanColor = (plan: string) => {
  switch (plan.toUpperCase()) {
    case "PREMIUM":
    case "DEVELOPER":
      return "bg-purple-100 text-purple-800";
    case "ENTERPRISE":
      return "bg-yellow-100 text-yellow-800";
    case "STARTUP":
    case "BUSINESS":
      return "bg-blue-100 text-blue-800";
    case "FREE":
    default:
      return "bg-green-100 text-green-800";
  }
};
