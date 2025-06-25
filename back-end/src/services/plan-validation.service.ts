import { WorkspacePlan } from "@prisma/client";

export interface PlanLimits {
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  maxQueues: number;
  maxServers: number;
  maxUsers: number | null; // null means unlimited
  maxInvitations: number | null; // null means unlimited
  maxMessagesPerMonth: number | null; // null means unlimited
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;
  canInviteUsers: boolean;
  userCostPerMonth?: number; // Cost per additional user per month
  // Node Memory Features
  canViewBasicMemoryMetrics: boolean;
  canViewAdvancedMemoryMetrics: boolean;
  canViewExpertMemoryMetrics: boolean;
  canViewMemoryTrends: boolean;
  canViewMemoryOptimization: boolean;
  // RabbitMQ Version Support
  supportedRabbitMqVersions: string[]; // Supported major.minor versions (e.g., ["3.12", "3.13", "4.0", "4.1"])
}

export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  [WorkspacePlan.FREE]: {
    canAddServer: true,
    canAddQueue: false,
    canSendMessages: false,
    canExportData: false,
    maxQueues: 1,
    maxServers: 1,
    maxUsers: 1,
    maxInvitations: 0,
    maxMessagesPerMonth: 0,
    hasAdvancedMetrics: false,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,
    canInviteUsers: false,
    // Memory Features - Immediate Value for everyone
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,
    // RabbitMQ Version Support - FREE users can only connect to 3.12 LTS
    supportedRabbitMqVersions: ["3.12"],
  },
  [WorkspacePlan.FREELANCE]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    maxQueues: 10,
    maxServers: 2,
    maxUsers: 2,
    maxInvitations: 1,
    maxMessagesPerMonth: 100,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,
    canInviteUsers: true,
    userCostPerMonth: 5,
    // Memory Features - Immediate Value for everyone
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,
    // RabbitMQ Version Support - FREELANCE users can only connect to 3.12 LTS
    supportedRabbitMqVersions: ["3.12"],
  },
  [WorkspacePlan.STARTUP]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    maxQueues: 50,
    maxServers: 10,
    maxUsers: 6,
    maxInvitations: 5,
    maxMessagesPerMonth: 1000,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: false,
    canInviteUsers: true,
    userCostPerMonth: 8,
    // Memory Features - Immediate Value + Advanced Features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,
    // RabbitMQ Version Support - STARTUP users can connect to all LTS versions
    supportedRabbitMqVersions: ["3.12", "3.13", "4.0", "4.1"],
  },
  [WorkspacePlan.BUSINESS]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    maxQueues: 200,
    maxServers: 50,
    maxUsers: null,
    maxInvitations: null,
    maxMessagesPerMonth: null, // unlimited
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: true,
    canInviteUsers: true,
    userCostPerMonth: 10,
    // Memory Features - All Features Available
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: true,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,
    // RabbitMQ Version Support - BUSINESS users can connect to all LTS versions
    supportedRabbitMqVersions: ["3.12", "3.13", "4.0", "4.1"],
  },
};

export class PlanValidationError extends Error {
  constructor(
    public feature: string,
    public currentPlan: WorkspacePlan,
    public requiredPlan: string,
    public currentCount?: number,
    public limit?: number,
    public details?: string // Additional details for the error
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

export function getPlanLimits(plan: WorkspacePlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function validatePlanFeature(
  plan: WorkspacePlan,
  feature: keyof PlanLimits
): boolean {
  const limits = getPlanLimits(plan);
  return limits[feature] as boolean;
}

export function validateQueueCreation(
  plan: WorkspacePlan,
  currentQueueCount: number
): void {
  const limits = getPlanLimits(plan);

  console.log(
    `validateQueueCreation: plan=${plan}, canAddQueue=${limits.canAddQueue}, currentCount=${currentQueueCount}, maxQueues=${limits.maxQueues}`
  );

  if (!limits.canAddQueue) {
    throw new PlanValidationError(
      "Queue creation",
      plan,
      "Freelance, Startup, or Business",
      currentQueueCount,
      limits.maxQueues
    );
  }

  if (currentQueueCount >= limits.maxQueues) {
    throw new PlanLimitExceededError(
      "Queue creation",
      currentQueueCount,
      limits.maxQueues,
      plan
    );
  }
}

export function validateServerCreation(
  plan: WorkspacePlan,
  currentServerCount: number
): void {
  const limits = getPlanLimits(plan);

  if (!limits.canAddServer) {
    throw new PlanValidationError(
      "Server creation",
      plan,
      "Freelance, Startup, or Business",
      currentServerCount,
      limits.maxServers
    );
  }

  if (currentServerCount >= limits.maxServers) {
    throw new PlanLimitExceededError(
      "Server creation",
      currentServerCount,
      limits.maxServers,
      plan
    );
  }
}

export function validateMessageSending(
  plan: WorkspacePlan,
  currentMonthlyMessages: number
): void {
  const limits = getPlanLimits(plan);

  console.log(
    `validateMessageSending: plan=${plan}, canSendMessages=${limits.canSendMessages}, currentMessages=${currentMonthlyMessages}, maxMessages=${limits.maxMessagesPerMonth}`
  );

  if (!limits.canSendMessages) {
    throw new PlanValidationError(
      "Message sending",
      plan,
      "Freelance, Startup, or Business",
      currentMonthlyMessages,
      limits.maxMessagesPerMonth || 0
    );
  }

  if (
    limits.maxMessagesPerMonth !== null &&
    currentMonthlyMessages >= limits.maxMessagesPerMonth
  ) {
    throw new PlanLimitExceededError(
      "Message sending",
      currentMonthlyMessages,
      limits.maxMessagesPerMonth,
      plan
    );
  }
}

export function validateUserInvitation(
  plan: WorkspacePlan,
  currentUserCount: number,
  pendingInvitations: number = 0
): void {
  const limits = getPlanLimits(plan);

  if (!limits.canInviteUsers) {
    throw new PlanValidationError(
      "User invitation",
      plan,
      "Freelance, Startup, or Business",
      currentUserCount,
      limits.maxUsers || 0
    );
  }

  // Check total user limit (current + pending)
  const totalUsers = currentUserCount + pendingInvitations;

  if (limits.maxUsers !== null && totalUsers >= limits.maxUsers) {
    throw new PlanLimitExceededError(
      "User invitation",
      totalUsers,
      limits.maxUsers,
      plan
    );
  }

  // Check invitation limit
  if (
    limits.maxInvitations !== null &&
    pendingInvitations >= limits.maxInvitations
  ) {
    throw new PlanLimitExceededError(
      "Pending invitations",
      pendingInvitations,
      limits.maxInvitations,
      plan
    );
  }
}

export function validateDataExport(plan: WorkspacePlan): void {
  const limits = getPlanLimits(plan);

  if (!limits.canExportData) {
    throw new PlanValidationError(
      "Data export",
      plan,
      "Freelance, Startup, or Business",
      0,
      0
    );
  }
}

// Memory Features Validation Functions
export function validateBasicMemoryMetricsAccess(plan: WorkspacePlan): void {
  const limits = getPlanLimits(plan);

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
  const limits = getPlanLimits(plan);

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
  const limits = getPlanLimits(plan);

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
  const limits = getPlanLimits(plan);

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
  const limits = getPlanLimits(plan);

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

// Additional Invitation Validation Functions
export function calculateMonthlyCostForUsers(
  plan: WorkspacePlan,
  additionalUsers: number
): number {
  const limits = getPlanLimits(plan);

  if (!limits.userCostPerMonth || additionalUsers <= 0) {
    return 0;
  }

  return limits.userCostPerMonth * additionalUsers;
}

export function canUserInviteUsers(plan: WorkspacePlan): boolean {
  return getPlanLimits(plan).canInviteUsers;
}

export function canUserInviteMoreUsers(
  plan: WorkspacePlan,
  currentUserCount: number,
  pendingInvitations: number = 0
): boolean {
  const limits = getPlanLimits(plan);

  if (!limits.canInviteUsers) {
    return false;
  }

  if (limits.maxUsers === null) {
    return true; // Unlimited
  }

  const totalUsers = currentUserCount + pendingInvitations;
  return totalUsers < limits.maxUsers;
}

export function getUserLimitText(plan: WorkspacePlan): string {
  const limits = getPlanLimits(plan);

  if (!limits.canInviteUsers) {
    return "Cannot invite users";
  }

  if (limits.maxUsers === null) {
    return "Unlimited users";
  }

  const additionalUsers = limits.maxUsers - 1; // Subtract admin
  return `Up to ${additionalUsers} additional user${additionalUsers === 1 ? "" : "s"}`;
}

export function getInvitationLimitText(plan: WorkspacePlan): string {
  const limits = getPlanLimits(plan);

  if (!limits.canInviteUsers) {
    return "Cannot send invitations";
  }

  if (limits.maxInvitations === null) {
    return "Unlimited invitations";
  }

  return `Up to ${limits.maxInvitations} invitation${limits.maxInvitations === 1 ? "" : "s"}`;
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
  const limits = getPlanLimits(plan);
  const majorMinorVersion = extractMajorMinorVersion(rabbitMqVersion);

  if (!limits.supportedRabbitMqVersions.includes(majorMinorVersion)) {
    const supportedVersionsStr = limits.supportedRabbitMqVersions.join(", ");
    throw new PlanValidationError(
      `RabbitMQ version ${majorMinorVersion}`,
      plan,
      plan === WorkspacePlan.FREE || plan === WorkspacePlan.FREELANCE
        ? "Startup or Business"
        : "a higher plan",
      undefined,
      undefined,
      `Supported versions for ${plan} plan: ${supportedVersionsStr}`
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
  const limits = getPlanLimits(plan);
  return queueCount > limits.maxQueues;
}

/**
 * Get warning message for over-limit server
 */
export function getOverLimitWarningMessage(
  plan: WorkspacePlan,
  queueCount: number,
  serverName: string
): string {
  const limits = getPlanLimits(plan);
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

/**
 * Get upgrade recommendation for over-limit scenario
 */
export function getUpgradeRecommendationForOverLimit(
  currentPlan: WorkspacePlan,
  queueCount: number
): { recommendedPlan: WorkspacePlan | null; message: string } {
  // Find the lowest plan that can accommodate the queue count
  const plans = [
    WorkspacePlan.FREELANCE,
    WorkspacePlan.STARTUP,
    WorkspacePlan.BUSINESS,
  ];

  for (const plan of plans) {
    if (plan === currentPlan) continue;

    const limits = getPlanLimits(plan);
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
 * Get all supported RabbitMQ versions for a given plan
 */
export function getSupportedRabbitMqVersions(plan: WorkspacePlan): string[] {
  const limits = getPlanLimits(plan);
  return limits.supportedRabbitMqVersions;
}
