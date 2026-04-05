import { TRPCError } from "@trpc/server";

import { isDemoMode } from "@/config/deployment";

/**
 * tRPC procedure paths that are blocked in demo mode.
 * These are destructive operations that shouldn't be available on demo.qarote.io.
 */
const BLOCKED_PATHS = new Set([
  // Server management
  "rabbitmq.addServer",
  "rabbitmq.removeServer",
  "rabbitmq.updateServer",
  // Queue management
  "rabbitmq.purgeQueue",
  "rabbitmq.deleteQueue",
  // User management
  "user.updateProfile",
  "user.changePassword",
  "user.deleteAccount",
  // Workspace management
  "workspace.update",
  "workspace.delete",
  "workspace.invite",
  "workspace.removeMember",
  // Organization management
  "organization.update",
  "organization.delete",
  "organization.invite",
  "organization.removeMember",
  // Auth
  "auth.register",
  // Alerts
  "alerts.createRule",
  "alerts.updateRule",
  "alerts.deleteRule",
  // Feedback
  "feedback.create",
  // Payment
  "payment.createCheckoutSession",
  "payment.cancelSubscription",
  // SSO
  "sso.create",
  "sso.update",
  "sso.delete",
  // License
  "selfhostedLicense.activate",
  "selfhostedLicense.deactivate",
]);

/**
 * Throw if the current procedure is blocked in demo mode.
 */
export function assertNotDemoBlocked(path: string, type: string): void {
  if (!isDemoMode()) return;
  if (type !== "mutation") return;

  if (BLOCKED_PATHS.has(path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This action is disabled on the demo instance. Deploy your own Qarote to unlock all features.",
    });
  }
}
