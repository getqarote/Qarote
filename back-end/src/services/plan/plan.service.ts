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
export function validateQueueCreation(
  plan: WorkspacePlan,
  currentQueueCount: number
): void {
  const features = getPlanFeatures(plan);

  if (!features.canAddQueue) {
    throw new PlanValidationError(
      "Queue creation",
      plan,
      "Developer, Startup, or Business"
    );
  }

  if (currentQueueCount >= features.maxQueues) {
    throw new PlanLimitExceededError(
      "Queue creation",
      currentQueueCount,
      features.maxQueues,
      plan
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
  currentPlan: WorkspacePlan,
  queueCount: number
): { recommendedPlan: WorkspacePlan | null; message: string } {
  // Find the lowest plan that can accommodate the queue count
  const plans = [
    WorkspacePlan.DEVELOPER,
    WorkspacePlan.STARTUP,
    WorkspacePlan.BUSINESS,
  ];

  for (const plan of plans) {
    if (plan === currentPlan) continue;

    const limits = getPlanFeatures(plan);
    if (queueCount <= limits.maxQueues) {
      return {
        recommendedPlan: plan,
        message: `Upgrade to ${plan} plan (supports up to ${limits.maxQueues} queues) to fully manage this server.`,
      };
    }
  }

  return {
    recommendedPlan: WorkspacePlan.BUSINESS,
    message: `Upgrade to BUSINESS plan for maximum queue capacity.`,
  };
}

/**
 * Get warning message for over-limit server
 */
export function getOverLimitWarningMessage(
  plan: WorkspacePlan,
  queueCount: number,
  serverName: string
): string {
  const limits = getPlanFeatures(plan);
  const overage = queueCount - limits.maxQueues;

  return `The server "${serverName}" has ${queueCount} queues, which exceeds your ${plan} plan limit of ${limits.maxQueues} queues by ${overage}. You can view existing queues but cannot create new ones. Consider upgrading your plan to manage all queues.`;
}

/**
 * Validate if queue creation is allowed on a server
 */
export function validateQueueCreationOnServer(
  plan: WorkspacePlan,
  currentQueueCount: number,
  isServerOverLimit: boolean,
  serverName: string
): void {
  // If server is flagged as over-limit, block all queue creation
  if (isServerOverLimit) {
    throw new PlanValidationError(
      "queue creation",
      plan,
      "a higher plan",
      undefined,
      undefined,
      `Server "${serverName}" exceeds your plan's queue limit. Please upgrade your plan to create new queues.`
    );
  }

  // Standard plan validation
  validateQueueCreation(plan, currentQueueCount);
}

// Memory Features Validation Functions
export function validateBasicMemoryMetricsAccess(plan: WorkspacePlan): void {
  const limits = getPlanFeatures(plan);

  if (!limits.canViewBasicMemoryMetrics) {
    throw new PlanValidationError(
      "Basic memory metrics access",
      plan,
      "All plans have access",
      0,
      0
    );
  }
}

export function validateAdvancedMemoryMetricsAccess(plan: WorkspacePlan): void {
  const limits = getPlanFeatures(plan);

  if (!limits.canViewAdvancedMemoryMetrics) {
    throw new PlanValidationError(
      "Advanced memory metrics access",
      plan,
      "Startup or Business",
      0,
      0
    );
  }
}

export function validateExpertMemoryMetricsAccess(plan: WorkspacePlan): void {
  const limits = getPlanFeatures(plan);

  if (!limits.canViewExpertMemoryMetrics) {
    throw new PlanValidationError(
      "Expert memory metrics access",
      plan,
      "Business",
      0,
      0
    );
  }
}

export function validateMemoryTrendsAccess(plan: WorkspacePlan): void {
  const limits = getPlanFeatures(plan);

  if (!limits.canViewMemoryTrends) {
    throw new PlanValidationError(
      "Memory trends access",
      plan,
      "Startup or Business",
      0,
      0
    );
  }
}

export function validateMemoryOptimizationAccess(plan: WorkspacePlan): void {
  const limits = getPlanFeatures(plan);

  if (!limits.canViewMemoryOptimization) {
    throw new PlanValidationError(
      "Memory optimization access",
      plan,
      "Startup or Business",
      0,
      0
    );
  }
}

/**
 * Check if a server has more queues than the plan allows
 */
export function isServerOverQueueLimit(
  plan: WorkspacePlan,
  queueCount: number
): boolean {
  const limits = getPlanFeatures(plan);
  return queueCount > limits.maxQueues;
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
      plan === WorkspacePlan.FREE || plan === WorkspacePlan.DEVELOPER
        ? "Startup or Business"
        : "a higher plan",
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
      "Developer, Startup, or Business"
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

export function validateMessageSending(
  plan: WorkspacePlan,
  currentMonthlyMessages: number
): void {
  const features = getPlanFeatures(plan);

  if (!features.canSendMessages) {
    throw new PlanValidationError(
      "Message sending",
      plan,
      "Developer, Startup, or Business"
    );
  }

  if (
    features.maxMessagesPerMonth !== null &&
    currentMonthlyMessages >= features.maxMessagesPerMonth
  ) {
    throw new PlanLimitExceededError(
      "Message sending",
      currentMonthlyMessages,
      features.maxMessagesPerMonth,
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
      "Developer, Startup, or Business"
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

export function validateDataExport(plan: WorkspacePlan): void {
  const features = getPlanFeatures(plan);

  if (!features.canExportData) {
    throw new PlanValidationError(
      "Data export",
      plan,
      "Developer, Startup, or Business"
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

export function canUserExportData(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canExportData;
}

export function canUserInviteUsers(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canInviteUsers;
}

export function canUserAccessRouting(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAccessRouting;
}

// Memory features
export function canUserViewBasicMemoryMetrics(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canViewBasicMemoryMetrics;
}

export function canUserViewAdvancedMemoryMetrics(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canViewAdvancedMemoryMetrics;
}

export function canUserViewExpertMemoryMetrics(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canViewExpertMemoryMetrics;
}

export function canUserViewMemoryTrends(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canViewMemoryTrends;
}

export function canUserViewMemoryOptimization(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canViewMemoryOptimization;
}

// Count-based validations
export function canUserAddQueueWithCount(
  plan: WorkspacePlan,
  currentQueueCount: number
): boolean {
  const features = getPlanFeatures(plan);
  return features.canAddQueue && currentQueueCount < features.maxQueues;
}

export function canUserAddServerWithCount(
  plan: WorkspacePlan,
  currentServerCount: number
): boolean {
  const features = getPlanFeatures(plan);
  if (!features.canAddServer) return false;
  if (features.maxServers === null) return true;
  return currentServerCount < features.maxServers;
}

export function canUserSendMessagesWithCount(
  plan: WorkspacePlan,
  currentMonthlyMessages: number
): boolean {
  const features = getPlanFeatures(plan);
  if (!features.canSendMessages) return false;
  if (features.maxMessagesPerMonth === null) return true;
  return currentMonthlyMessages < features.maxMessagesPerMonth;
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
export function getQueueLimitForPlan(plan: WorkspacePlan): number {
  return getPlanFeatures(plan).maxQueues;
}

export function getServerLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxServers;
}

export function getUserLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxUsers;
}

export function getMessageLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxMessagesPerMonth;
}

export function getInvitationLimitForPlan(plan: WorkspacePlan): number | null {
  return getPlanFeatures(plan).maxInvitations;
}

// Limit text helpers
export function getQueueLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canAddQueue) return "Cannot add queues";
  return `Up to ${features.maxQueues} queues`;
}

export function getServerLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canAddServer) return "Cannot add servers";
  if (features.maxServers === null) return "Unlimited servers";
  return `Up to ${features.maxServers} servers`;
}

export function getMessageLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canSendMessages) return "Cannot send messages";
  if (features.maxMessagesPerMonth === null) return "Unlimited messages";
  return `${features.maxMessagesPerMonth.toLocaleString()} messages/month`;
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

// Message history features
export function getAvailableRetentionPeriods(plan: WorkspacePlan): number[] {
  return getPlanFeatures(plan).availableRetentionPeriods;
}

export function getMaxMessageHistoryStorage(plan: WorkspacePlan): number {
  return getPlanFeatures(plan).maxMessageHistoryStorage;
}

export function canUserAccessMessageHistory(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAccessMessageHistory;
}

export function canUserConfigureRetention(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canConfigureRetention;
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
  const [serverCount, queueCount, userCount] = await Promise.all([
    prisma.rabbitMQServer.count({
      where: { workspaceId },
    }),
    prisma.queue.count({
      where: {
        server: {
          workspaceId,
        },
      },
    }),
    prisma.user.count({
      where: { workspaceId },
    }),
  ]);

  return {
    servers: serverCount,
    queues: queueCount,
    users: userCount,
  };
}

export async function getMonthlyMessageCount(
  workspaceId: string
): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed

  try {
    const messageCount = await prisma.monthlyMessageCount.findUnique({
      where: {
        monthly_message_count_unique: {
          workspaceId,
          year,
          month,
        },
      },
    });

    return messageCount?.count || 0;
  } catch (error) {
    logger.error({ error }, "Error fetching monthly message count");
    return 0;
  }
}

export async function incrementMonthlyMessageCount(
  workspaceId: string
): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed

  try {
    // Use upsert to either create a new record or increment existing one
    const messageCount = await prisma.monthlyMessageCount.upsert({
      where: {
        monthly_message_count_unique: {
          workspaceId,
          year,
          month,
        },
      },
      update: {
        count: {
          increment: 1,
        },
      },
      create: {
        workspaceId,
        year,
        month,
        count: 1,
      },
    });

    return messageCount.count;
  } catch (error) {
    logger.error({ error }, "Error incrementing monthly message count");
    throw new Error("Failed to increment message count");
  }
}
