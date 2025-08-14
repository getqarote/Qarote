import { WorkspacePlan } from "@prisma/client";
import { getPlanFeatures, type PlanFeatures } from "./features.service";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

// Re-export for convenience
export {
  PLAN_FEATURES,
  getPlanFeatures,
  type PlanFeatures,
} from "./features.service";

// Error classes
export class PlanValidationError extends Error {
  constructor(
    public feature: string,
    public currentPlan: WorkspacePlan,
    public requiredPlan: string,
    public currentCount?: number,
    public limit?: number,
    public details?: string
  ) {
    super(
      `${feature} is not available on the ${currentPlan} plan. Upgrade to ${requiredPlan} plan.${
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
    public currentPlan: WorkspacePlan
  ) {
    super(
      `${feature} limit exceeded. Current: ${currentCount}, Limit: ${limit} for ${currentPlan} plan.`
    );
    this.name = "PlanLimitExceededError";
  }
}

// Validation functions
export function validateQueueCreation(plan: WorkspacePlan): void {
  const features = getPlanFeatures(plan);

  if (!features.canAddQueue) {
    throw new PlanValidationError(
      "Queue creation",
      plan,
      "Developer or Enterprise"
    );
  }
}

export function validateExchangeCreation(plan: WorkspacePlan): void {
  const features = getPlanFeatures(plan);

  if (!features.canAddExchange) {
    throw new PlanValidationError(
      "Exchange creation",
      plan,
      "Developer or Enterprise"
    );
  }
}

export function validateVirtualHostCreation(plan: WorkspacePlan): void {
  const features = getPlanFeatures(plan);

  if (!features.canAddVirtualHost) {
    throw new PlanValidationError(
      "Virtual Host creation",
      plan,
      "Developer or Enterprise"
    );
  }
}

export function validateRabbitMQUserCreation(plan: WorkspacePlan): void {
  const features = getPlanFeatures(plan);

  if (!features.canAddRabbitMQUser) {
    throw new PlanValidationError(
      "RabbitMQ User creation",
      plan,
      "Developer or Enterprise"
    );
  }
}

// Additional Invitation Validation Functions
export function calculateMonthlyCostForUsers(
  plan: WorkspacePlan,
  additionalUsers: number
): number {
  const limits = getPlanFeatures(plan);

  if (!limits.userCostPerMonth || additionalUsers <= 0) {
    return 0;
  }

  return limits.userCostPerMonth * additionalUsers;
}

/**
 * Get upgrade recommendation for over-limit scenario
 */
export function getUpgradeRecommendationForOverLimit(
  currentPlan: WorkspacePlan
): { recommendedPlan: WorkspacePlan | null; message: string } {
  // Simple upgrade path: Free -> Developer -> Enterprise
  if (currentPlan === WorkspacePlan.FREE) {
    return {
      recommendedPlan: WorkspacePlan.DEVELOPER,
      message: `Upgrade to Developer plan for enhanced features and queue management.`,
    };
  }

  if (currentPlan === WorkspacePlan.DEVELOPER) {
    return {
      recommendedPlan: WorkspacePlan.ENTERPRISE,
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
  plan: WorkspacePlan,
  rabbitMqVersion: string
): void {
  const limits = getPlanFeatures(plan);
  const majorMinorVersion = extractMajorMinorVersion(rabbitMqVersion);

  if (!limits.supportedRabbitMqVersions.includes(majorMinorVersion)) {
    const supportedVersionsStr = limits.supportedRabbitMqVersions.join(", ");

    throw new PlanValidationError(
      `RabbitMQ version ${majorMinorVersion}`,
      plan,
      plan === WorkspacePlan.FREE ? "Developer or Enterprise" : "Enterprise",
      undefined,
      undefined,
      `Supported versions for ${plan} plan: ${supportedVersionsStr}`
    );
  }
}

export function validateServerCreation(
  plan: WorkspacePlan,
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
  plan: WorkspacePlan,
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
  plan: WorkspacePlan,
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

// Access helper functions
export function canUserAddQueue(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAddQueue;
}

export function canUserSendMessages(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canSendMessages;
}

export function canUserAddServer(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAddServer;
}

export function canUserAddExchange(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAddExchange;
}

export function canUserAddVirtualHost(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAddVirtualHost;
}

export function canUserAddRabbitMQUser(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAddRabbitMQUser;
}

export function canUserInviteUsers(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canInviteUsers;
}

// Count-based validations
export function canUserAddServerWithCount(
  plan: WorkspacePlan,
  currentServerCount: number
): boolean {
  const features = getPlanFeatures(plan);
  if (!features.canAddServer) return false;
  if (features.maxServers === null) return true;
  return currentServerCount < features.maxServers;
}

export function canUserAddWorkspaceWithCount(
  plan: WorkspacePlan,
  currentWorkspaceCount: number
): boolean {
  const features = getPlanFeatures(plan);
  if (features.maxWorkspaces === null) return true;
  return currentWorkspaceCount < features.maxWorkspaces;
}

export function canUserInviteMoreUsers(
  plan: WorkspacePlan,
  currentUserCount: number
): boolean {
  const features = getPlanFeatures(plan);
  if (!features.canInviteUsers) return false;
  if (features.maxUsers === null) return true;
  return currentUserCount < features.maxUsers;
}

// Display helpers
export function getPlanDisplayName(plan: WorkspacePlan): string {
  return getPlanFeatures(plan).displayName;
}

export function getPlanColor(plan: WorkspacePlan): string {
  return getPlanFeatures(plan).color;
}

export function getPlanDescription(plan: WorkspacePlan): string {
  return getPlanFeatures(plan).description;
}

export function getPlanFeatureDescriptions(plan: WorkspacePlan): string[] {
  return getPlanFeatures(plan).featureDescriptions;
}

// Pricing helpers
export function getMonthlyPrice(plan: WorkspacePlan): string {
  const price = getPlanFeatures(plan).monthlyPrice;
  return price === 0 ? "Free" : `$${(price / 100).toFixed(0)}`;
}

export function getYearlyPrice(plan: WorkspacePlan): string {
  const price = getPlanFeatures(plan).yearlyPrice;
  return price === 0 ? "Free" : `$${(price / 100).toFixed(0)}`;
}

export function getMonthlyPriceInCents(plan: WorkspacePlan): number {
  return getPlanFeatures(plan).monthlyPrice;
}

export function getYearlyPriceInCents(plan: WorkspacePlan): number {
  return getPlanFeatures(plan).yearlyPrice;
}

export function getYearlySavings(plan: WorkspacePlan): string | null {
  const features = getPlanFeatures(plan);
  if (features.monthlyPrice === 0 || features.yearlyPrice === 0) return null;

  const monthlyAnnual = features.monthlyPrice * 12;
  const yearlyAnnual = features.yearlyPrice * 12;
  const savings = monthlyAnnual - yearlyAnnual;

  if (savings <= 0) return null;

  return `$${(savings / 100).toFixed(0)}`;
}

// Limit getters
export function getServerLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxServers;
}

export function getWorkspaceLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxWorkspaces;
}

export function getUserLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxUsers;
}

export function getInvitationLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxInvitations;
}

// Limit text helpers
export function getServerLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canAddServer) return "Cannot add servers";
  if (features.maxServers === null) return "Unlimited servers";
  return `Up to ${features.maxServers} servers`;
}

export function getWorkspaceLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (features.maxWorkspaces === null) return "Unlimited workspaces";
  return `Up to ${features.maxWorkspaces} workspaces`;
}

export function getUserLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canInviteUsers) return "Cannot invite users";
  if (features.maxUsers === null) return "Unlimited users";
  const additionalUsers = features.maxUsers - 1;
  return `Up to ${additionalUsers} additional user${additionalUsers === 1 ? "" : "s"}`;
}

export function getInvitationLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canInviteUsers) return "Cannot send invitations";
  if (features.maxInvitations === null) return "Unlimited invitations";
  return `Up to ${features.maxInvitations} pending invitations`;
}

// RabbitMQ version support
export function getSupportedRabbitMqVersions(plan: WorkspacePlan): string[] {
  return getPlanFeatures(plan).supportedRabbitMqVersions;
}

export function isRabbitMqVersionSupported(
  plan: WorkspacePlan,
  version: string
): boolean {
  const supportedVersions = getSupportedRabbitMqVersions(plan);
  return supportedVersions.includes(version);
}

export async function getWorkspacePlan(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  return workspace.plan;
}

export async function getWorkspaceResourceCounts(workspaceId: string) {
  const [serverCount, userCount] = await Promise.all([
    prisma.rabbitMQServer.count({
      where: { workspaceId },
    }),
    prisma.user.count({
      where: { workspaceId },
    }),
  ]);

  return {
    servers: serverCount,
    users: userCount,
    workspaces: 1, // For now, each user has one workspace
  };
}
