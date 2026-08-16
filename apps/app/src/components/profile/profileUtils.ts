/**
 * Profile page utility functions and types
 */

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
