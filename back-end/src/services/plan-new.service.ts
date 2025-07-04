import { WorkspacePlan } from "@prisma/client";
import { getPlanFeatures, type PlanFeatures } from "./plan-data.service";

// Re-export for convenience
export {
  PLAN_FEATURES,
  getPlanFeatures,
  type PlanFeatures,
} from "./plan-data.service";

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

// Legacy exports for backward compatibility
export function getUnifiedPlanFeatures(plan: WorkspacePlan): PlanFeatures {
  return getPlanFeatures(plan);
}
