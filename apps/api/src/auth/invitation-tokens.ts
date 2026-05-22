import crypto from "node:crypto";

/**
 * Invitation tokens — RBAC §2.5 / R-INV-1.
 *
 * The raw token is sent to the invitee via email link and never persisted.
 * The DB stores `tokenHash` (SHA-256 hex of the raw token). On accept, the
 * incoming token is hashed and compared to the stored hash.
 */

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
