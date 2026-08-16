import { prisma } from "@/core/prisma";

import { isDemoMode } from "@/config/deployment";

import { getPlanFeatures } from "./features.service";

import { UserPlan } from "@/generated/prisma/client";

// Re-export for convenience
export { getPlanFeatures, PLAN_FEATURES } from "./features.service";

// Error classes —
// surfaced over tRPC via the unified `gate` wire shape (ADR-002).
// Translation into a `BlockedGate` and use of `throwGateError` is
// restricted to the validation-middleware layer (`planValidationProcedure`,
// `workspaceAdminPlanValidationProcedure` in `trpc.ts`, plus any future
// gate-translation middleware that uses the same helper). Direct
// catch-and-rethrow in router or service code is a smell — let the
// middleware do it so every call site emits the same wire shape.
export class PlanValidationError extends Error {
  constructor(
    public feature: string,
    public currentPlan: UserPlan,
    public requiredPlan: UserPlan | string,
    public currentCount?: number,
    public limit?: number,
    public details?: string
  ) {
    const requiredPlanDisplay =
      typeof requiredPlan === "string"
        ? requiredPlan
        : getPlanDisplayName(requiredPlan);
    super(
      `${feature} is not available on the ${currentPlan} plan. Upgrade to ${requiredPlanDisplay} plan.${
        details ? " " + details : ""
      }`
    );
    this.name = "PlanValidationError";
  }
}

export class PlanLimitExceededError extends Error {
  constructor(
    public feature: string,
    public currentCount: number,
    public limit: number,
    public currentPlan: UserPlan
  ) {
    super(
      `${feature} limit exceeded. Current: ${currentCount}, Limit: ${limit} for ${currentPlan} plan.`
    );
    this.name = "PlanLimitExceededError";
  }
}

/**
 * Extract major.minor version from full RabbitMQ version string
 * Examples: "3.12.10" -> "3.12", "4.0.1" -> "4.0", "4.1.0-rc.1" -> "4.1"
 */
export function extractMajorMinorVersion(fullVersion: string): string {
  const versionMatch = fullVersion.match(/^(\d+\.\d+)/);
  return versionMatch ? versionMatch[1] : fullVersion;
}

/**
 * Validate if a RabbitMQ version is supported by the current plan
 */
export function validateRabbitMqVersion(
  plan: UserPlan,
  rabbitMqVersion: string
): void {
  const limits = getPlanFeatures(plan);
  const majorMinorVersion = extractMajorMinorVersion(rabbitMqVersion);

  if (!limits.supportedRabbitMqVersions.includes(majorMinorVersion)) {
    const supportedVersionsStr = limits.supportedRabbitMqVersions.join(", ");

    throw new PlanValidationError(
      `RabbitMQ version ${majorMinorVersion}`,
      plan,
      plan === UserPlan.FREE ? "Developer or Enterprise" : "Enterprise",
      undefined,
      undefined,
      `Supported versions for ${plan} plan: ${supportedVersionsStr}`
    );
  }
}

export function validateServerCreation(
  plan: UserPlan,
  currentServerCount: number
): void {
  const features = getPlanFeatures(plan);

  if (!features.canAddServer) {
    throw new PlanValidationError(
      "Server creation",
      plan,
      "Developer or Enterprise"
    );
  }

  if (
    features.maxServers !== null &&
    currentServerCount >= features.maxServers
  ) {
    throw new PlanLimitExceededError(
      "Server creation",
      currentServerCount,
      features.maxServers,
      plan
    );
  }
}

export function validateWorkspaceCreation(
  plan: UserPlan,
  currentWorkspaceCount: number
): void {
  const features = getPlanFeatures(plan);

  if (
    features.maxWorkspaces !== null &&
    currentWorkspaceCount >= features.maxWorkspaces
  ) {
    throw new PlanLimitExceededError(
      "Workspace creation",
      currentWorkspaceCount,
      features.maxWorkspaces,
      plan
    );
  }
}

export function validateUserInvitation(
  plan: UserPlan,
  currentUserCount: number,
  pendingInvitations: number = 0
): void {
  const features = getPlanFeatures(plan);

  if (!features.canInviteUsers) {
    throw new PlanValidationError(
      "User invitation",
      plan,
      "Developer or Enterprise"
    );
  }

  const totalUsers = currentUserCount + pendingInvitations;

  if (features.maxUsers !== null && totalUsers >= features.maxUsers) {
    throw new PlanLimitExceededError(
      "User invitation",
      totalUsers,
      features.maxUsers,
      plan
    );
  }

  if (
    features.maxInvitations !== null &&
    pendingInvitations >= features.maxInvitations
  ) {
    throw new PlanLimitExceededError(
      "Pending invitations",
      pendingInvitations,
      features.maxInvitations,
      plan
    );
  }
}

// Display helpers
function getPlanDisplayName(plan: UserPlan): string {
  return getPlanFeatures(plan).displayName;
}

/**
 * New organizations get a 14-day Enterprise trial from signup so the whole
 * product is usable out of the box. The trial is computed from the org's
 * createdAt — no Subscription row, no fake Stripe data — and auto-expires to
 * FREE once the window passes. A real paid Subscription always takes
 * precedence over the trial.
 */
const SIGNUP_TRIAL_DAYS = 14;
const SIGNUP_TRIAL_MS = SIGNUP_TRIAL_DAYS * 24 * 60 * 60 * 1000;

function isWithinSignupTrial(orgCreatedAt: Date): boolean {
  return Date.now() < orgCreatedAt.getTime() + SIGNUP_TRIAL_MS;
}

/**
 * Resolve an org's effective plan: a real subscription if present, else the
 * Enterprise signup trial while the window is open, else FREE.
 */
function resolvePlan(
  subscriptionPlan: UserPlan | undefined,
  orgCreatedAt: Date | undefined
): UserPlan {
  if (subscriptionPlan) return subscriptionPlan;
  if (orgCreatedAt && isWithinSignupTrial(orgCreatedAt)) {
    return UserPlan.ENTERPRISE;
  }
  return UserPlan.FREE;
}

/**
 * Get the plan for an organization: paid subscription > signup trial > FREE.
 */
export async function getOrgPlan(orgId: string): Promise<UserPlan> {
  // Demo mode: treat as Enterprise so all plan-gated features are visible
  if (isDemoMode()) {
    return UserPlan.ENTERPRISE;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      createdAt: true,
      subscription: { select: { plan: true } },
    },
  });

  return resolvePlan(org?.subscription?.plan, org?.createdAt);
}

/**
 * Get the plan for a workspace by resolving its organization.
 *
 * Single roundtrip via a nested-select join: previously this did two
 * sequential queries (workspace.findUnique + subscription.findUnique),
 * paying that cost on every audit emission. The audit hot path can
 * fire dozens of these in a bulk op; one roundtrip cuts ~50% of the
 * latency tax for Free / Developer tenants who get nothing from it.
 */
export async function getWorkspacePlan(workspaceId: string): Promise<UserPlan> {
  if (isDemoMode()) {
    return UserPlan.ENTERPRISE;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      organization: {
        select: {
          createdAt: true,
          subscription: { select: { plan: true } },
        },
      },
    },
  });

  const org = workspace?.organization;
  return resolvePlan(org?.subscription?.plan, org?.createdAt);
}

/**
 * Get resource counts scoped to an organization.
 */
export async function getOrgResourceCounts(orgId: string) {
  const [serverCount, memberCount, workspaceCount] = await Promise.all([
    prisma.rabbitMQServer.count({
      where: {
        workspace: {
          organizationId: orgId,
        },
      },
    }),
    prisma.organizationMember.count({
      where: { organizationId: orgId },
    }),
    prisma.workspace.count({
      where: { organizationId: orgId },
    }),
  ]);

  return {
    servers: serverCount,
    users: memberCount,
    workspaces: workspaceCount,
  };
}

// Simplified validation for queue creation (no limits in new plan structure)
export function validateQueueCreationOnServer(
  plan: UserPlan,
  currentQueueCount: number
): void {
  // Since we removed queue limits, just ensure basic permissions
  const features = getPlanFeatures(plan);
  if (!features.canAddQueue) {
    throw new PlanValidationError(
      "Queue creation",
      plan,
      UserPlan.DEVELOPER,
      currentQueueCount,
      undefined,
      "Upgrade to Developer plan to create queues."
    );
  }
}
