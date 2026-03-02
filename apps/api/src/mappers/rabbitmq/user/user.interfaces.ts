/**
 * User API Response Types
 *
 * Lean response types containing only fields actually used by the web.
 */

/**
 * User API Response - only fields used by web
 */
export interface UserResponse {
  name: string;
  tags?: string[];
  password_hash?: string; // Only for existence check
  limits?: {
    max_connections?: number;
    max_channels?: number;
  };
  accessibleVhosts?: string[];
}
