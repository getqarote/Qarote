import { prisma } from "@/core/prisma";

import { getPlanFeatures } from "./features.service";

import { UserPlan } from "@/generated/prisma/client";

// Re-export for convenience
export { getPlanFeatures, PLAN_FEATURES } from "./features.service";

// Error codes enum
export enum PlanErrorCode {
  PLAN_RESTRICTION = "PLAN_RESTRICTION",
  PLAN_LIMIT_EXCEEDED = "PLAN_LIMIT_EXCEEDED",
}

// Error classes
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
 * Get upgrade recommendation for over-limit scenario
 */
export function getUpgradeRecommendationForOverLimit(currentPlan: UserPlan): {
  recommendedPlan: UserPlan | null;
  message: string;
} {
  // Simple upgrade path: Free -> Developer -> Enterprise
  if (currentPlan === UserPlan.FREE) {
    return {
      recommendedPlan: UserPlan.DEVELOPER,
      message: `Upgrade to Developer plan for enhanced features and queue management.`,
    };
  }

  if (currentPlan === UserPlan.DEVELOPER) {
    return {
      recommendedPlan: UserPlan.ENTERPRISE,
      message: `Upgrade to Enterprise plan for unlimited resources and priority support.`,
    };
  }

  return {
    recommendedPlan: null,
    message: `You are already on the highest plan.`,
  };
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

// Count-based validations

export function canUserAddWorkspaceWithCount(
  plan: UserPlan,
  currentWorkspaceCount: number
): boolean {
  const features = getPlanFeatures(plan);
  if (features.maxWorkspaces === null) return true;
  return currentWorkspaceCount < features.maxWorkspaces;
}

// Display helpers
export function getPlanDisplayName(plan: UserPlan): string {
  return getPlanFeatures(plan).displayName;
}

/**
 * Get the plan for an organization by looking up its subscription.
 */
export async function getOrgPlan(orgId: string): Promise<UserPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    select: { plan: true },
  });

  return subscription?.plan ?? UserPlan.FREE;
}

/**
 * Get a user's plan by looking up their organization membership and
 * delegating to getOrgPlan. Falls back to FREE if no membership is found.
 */
export async function getUserPlan(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { role: "asc" },
  });

  if (membership) {
    return getOrgPlan(membership.organizationId);
  }

  return UserPlan.FREE;
}

/**
 * Get the plan for a workspace by resolving its organization.
 */
export async function getWorkspacePlan(workspaceId: string): Promise<UserPlan> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { organizationId: true },
  });

  if (workspace?.organizationId) {
    return getOrgPlan(workspace.organizationId);
  }

  return UserPlan.FREE;
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

/**
 * Get resource counts for a user by looking up their organization membership
 * and delegating to getOrgResourceCounts. Returns zeros if no membership is found.
 */
export async function getUserResourceCounts(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
    orderBy: { role: "asc" },
  });

  if (membership) {
    return getOrgResourceCounts(membership.organizationId);
  }

  return {
    servers: 0,
    users: 0,
    workspaces: 0,
  };
}

export function getOverLimitWarningMessage(
  plan: UserPlan,
  currentCount: number
): string {
  const planName = getPlanDisplayName(plan);
  return `Queue management available on ${planName} plan. Current queues: ${currentCount}`;
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
