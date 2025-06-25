export enum WorkspacePlan {
  FREE = "FREE",
  FREELANCE = "FREELANCE",
  STARTUP = "STARTUP",
  BUSINESS = "BUSINESS",
}

export interface PlanFeatures {
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  canAccessRouting: boolean;
  maxQueues?: number;
  maxServers?: number;
  maxUsers?: number;
  maxMessagesPerMonth?: number;
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;
  // Node Memory Features
  canViewBasicMemoryMetrics: boolean;
  canViewAdvancedMemoryMetrics: boolean;
  canViewExpertMemoryMetrics: boolean;
  canViewMemoryTrends: boolean;
  canViewMemoryOptimization: boolean;
}

export const PLAN_FEATURES: Record<WorkspacePlan, PlanFeatures> = {
  [WorkspacePlan.FREE]: {
    canAddServer: true,
    canAddQueue: false,
    canSendMessages: false,
    canExportData: false,
    canAccessRouting: false,
    maxQueues: 1,
    maxServers: 1,
    maxUsers: 1,
    maxMessagesPerMonth: 0,
    hasAdvancedMetrics: false,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,
    // Memory Features - Immediate Value for everyone
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,
  },
  [WorkspacePlan.FREELANCE]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    canAccessRouting: false,
    maxQueues: 10,
    maxServers: 2,
    maxUsers: 2,
    maxMessagesPerMonth: 100,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,
    // Memory Features - Immediate Value for everyone
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,
  },
  [WorkspacePlan.STARTUP]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    canAccessRouting: true,
    maxQueues: 50,
    maxServers: 5,
    maxUsers: 5,
    maxMessagesPerMonth: 1000,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: false,
    // Memory Features - Immediate Value + Advanced Features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,
  },
  [WorkspacePlan.BUSINESS]: {
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    canAccessRouting: true,
    maxQueues: 200,
    maxServers: undefined, // unlimited
    maxUsers: 25,
    maxMessagesPerMonth: undefined, // unlimited
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: true,
    // Memory Features - All Features Available
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: true,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,
  },
};

export function getPlanFeatures(plan: WorkspacePlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}

export function canUserAddQueue(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAddQueue;
}

export function canUserSendMessages(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canSendMessages;
}

export function canUserAddServer(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAddServer;
}

export function canUserAddServerWithCount(
  plan: WorkspacePlan,
  currentServerCount: number
): boolean {
  const features = getPlanFeatures(plan);

  if (!features.canAddServer) {
    return false;
  }

  // If maxServers is undefined, it's unlimited
  if (features.maxServers === undefined) {
    return true;
  }

  return currentServerCount < features.maxServers;
}

export function canUserAddQueueWithCount(
  plan: WorkspacePlan,
  currentQueueCount: number
): boolean {
  const features = getPlanFeatures(plan);

  if (!features.canAddQueue) {
    return false;
  }

  // If maxQueues is undefined, it's unlimited
  if (features.maxQueues === undefined) {
    return true;
  }

  return currentQueueCount < features.maxQueues;
}

export function canUserSendMessagesWithCount(
  plan: WorkspacePlan,
  currentMonthlyMessages: number
): boolean {
  const features = getPlanFeatures(plan);

  if (!features.canSendMessages) {
    return false;
  }

  // If maxMessagesPerMonth is undefined, it's unlimited
  if (features.maxMessagesPerMonth === undefined) {
    return true;
  }

  return currentMonthlyMessages < features.maxMessagesPerMonth;
}

export function getQueueLimitForPlan(plan: WorkspacePlan): number | undefined {
  return getPlanFeatures(plan).maxQueues;
}

export function getQueueLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canAddQueue) {
    return "Cannot add queues";
  }
  if (features.maxQueues === undefined) {
    return "Unlimited queues";
  }
  return `Up to ${features.maxQueues} queues`;
}

export function canUserExportData(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canExportData;
}

export function getMessageLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canSendMessages) {
    return "Cannot send messages";
  }
  if (features.maxMessagesPerMonth === undefined) {
    return "Unlimited messages";
  }
  return `${features.maxMessagesPerMonth} messages/month`;
}

export function getMessageLimitForPlan(
  plan: WorkspacePlan
): number | undefined {
  return getPlanFeatures(plan).maxMessagesPerMonth;
}

export function getServerLimitText(plan: WorkspacePlan): string {
  const features = getPlanFeatures(plan);
  if (!features.canAddServer) {
    return "Cannot add servers";
  }
  if (features.maxServers === undefined) {
    return "Unlimited servers";
  }
  return `Up to ${features.maxServers} servers`;
}

export function getServerLimitForPlan(plan: WorkspacePlan): number | undefined {
  return getPlanFeatures(plan).maxServers;
}

export function getPlanDisplayName(plan: WorkspacePlan): string {
  switch (plan) {
    case WorkspacePlan.FREE:
      return "Free";
    case WorkspacePlan.FREELANCE:
      return "Freelance";
    case WorkspacePlan.STARTUP:
      return "Startup";
    case WorkspacePlan.BUSINESS:
      return "Business";
    default:
      return "Unknown";
  }
}

export function getPlanColor(plan: WorkspacePlan): string {
  switch (plan) {
    case WorkspacePlan.FREE:
      return "text-white bg-gray-600";
    case WorkspacePlan.FREELANCE:
      return "text-white bg-blue-600";
    case WorkspacePlan.STARTUP:
      return "text-white bg-green-600";
    case WorkspacePlan.BUSINESS:
      return "text-white bg-purple-600";
    default:
      return "text-white bg-gray-600";
  }
}

export function canUserAccessRouting(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAccessRouting;
}

// Memory Features Access Control
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
