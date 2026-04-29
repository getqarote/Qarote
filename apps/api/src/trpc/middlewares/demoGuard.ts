import { TRPCError } from "@trpc/server";

/**
 * Fully-qualified tRPC procedure paths blocked in demo mode.
 * These are destructive operations that shouldn't be available on demo.qarote.io.
 *
 * Path format matches opts.path in tRPC middleware: "router.subrouter.procedure"
 */
const BLOCKED_PATHS = new Set([
  // Server management (rabbitmq.server.*)
  "rabbitmq.server.createServer",
  "rabbitmq.server.updateServer",
  "rabbitmq.server.deleteServer",
  // Queue management (rabbitmq.queues.*)
  "rabbitmq.queues.createQueue",
  "rabbitmq.queues.purgeQueue",
  "rabbitmq.queues.deleteQueue",
  "rabbitmq.queues.pauseQueue",
  "rabbitmq.queues.resumeQueue",
  // User management (user.*)
  "user.updateProfile",
  "user.updateUser",
  "user.removeFromWorkspace",
  // Auth (auth.*)
  "auth.registration.register",
  "auth.password.changePassword",
  // Workspace management (workspace.*)
  "workspace.management.create",
  "workspace.management.update",
  "workspace.management.delete",
  "workspace.invitation.sendInvitation",
  "workspace.invitation.revokeInvitation",
  // Organization management (organization.*)
  "organization.management.update",
  "organization.members.invite",
  "organization.members.removeMember",
  "organization.members.updateRole",
  // Alert rules (alerts.rules.*)
  "alerts.rules.createRule",
  "alerts.rules.updateRule",
  "alerts.rules.deleteRule",
  // Feedback
  "feedback.submit",
  // Payment (payment.*)
  "payment.checkout.createCheckoutSession",
  "payment.subscription.cancelSubscription",
  "payment.subscription.renewSubscription",
  // SSO
  "sso.registerProvider",
  "sso.updateProvider",
  "sso.deleteProvider",
  // License
  "selfhostedLicense.activate",
  "selfhostedLicense.deactivate",
]);

/**
 * Throw if the current procedure is blocked in demo mode.
 */
export function assertNotDemoBlocked(path: string, type: string): void {
  if (process.env.DEMO_MODE !== "true") return;
  if (type !== "mutation") return;

  if (BLOCKED_PATHS.has(path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This action is disabled on the demo instance. Deploy your own Qarote to unlock all features.",
    });
  }
}
