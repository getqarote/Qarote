import { WorkspacePlan } from "@prisma/client";

export interface PlanLimits {
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  maxQueues: number;
  maxServers: number;
  maxUsers: number;
  maxMessagesPerMonth: number | null; // null means unlimited
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;
}

export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  [WorkspacePlan.FREE]: {
    canAddQueue: false,
    canSendMessages: false,
    canAddServer: false,
    canExportData: false,
    maxQueues: 0,
    maxServers: 1,
    maxUsers: 1,
    maxMessagesPerMonth: 0,
    hasAdvancedMetrics: false,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,
  },
  [WorkspacePlan.FREELANCE]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    maxQueues: 10,
    maxServers: 3,
    maxUsers: 1,
    maxMessagesPerMonth: 100,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,
  },
  [WorkspacePlan.STARTUP]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    maxQueues: 50,
    maxServers: 10,
    maxUsers: 5,
    maxMessagesPerMonth: 1000,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: false,
  },
  [WorkspacePlan.BUSINESS]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    maxQueues: 200,
    maxServers: 50,
    maxUsers: 25,
    maxMessagesPerMonth: null, // unlimited
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: true,
  },
};

export class PlanValidationError extends Error {
  constructor(
    public feature: string,
    public currentPlan: WorkspacePlan,
    public requiredPlan: string,
    public currentCount?: number,
    public limit?: number
  ) {
    super(
      `${feature} is not available on the ${currentPlan} plan. Upgrade to ${requiredPlan} plan.`
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
  currentUserCount: number
): void {
  const limits = getPlanLimits(plan);

  if (currentUserCount >= limits.maxUsers) {
    throw new PlanLimitExceededError(
      "User invitation",
      currentUserCount,
      limits.maxUsers,
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
