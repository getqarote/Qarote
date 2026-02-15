import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Core utility functions
 * Shared utilities used across the application
 */

/**
 * Get the directory name of the current ES module.
 * ESM equivalent of CommonJS `__dirname`.
 */
export function getDirname(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl));
}

/**
 * Get user display name from first and last name
 */
export function getUserDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.firstName || user.lastName || "User";
}

/**
 * Format invitedBy user for API response
 * Returns null if the user is null, otherwise returns formatted object
 */
export function formatInvitedBy(
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null
): {
  id: string;
  email: string;
  displayName: string;
} | null {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    displayName: getUserDisplayName(user),
  };
}
