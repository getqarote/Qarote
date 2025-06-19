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
}

export const PLAN_FEATURES: Record<WorkspacePlan, PlanFeatures> = {
  [WorkspacePlan.FREE]: {
    canAddQueue: false,
    canSendMessages: false,
    canAddServer: false,
    canExportData: false,
    canAccessRouting: false,
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
    canAccessRouting: true,
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
    canAccessRouting: true,
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
    canAccessRouting: true,
    maxQueues: 200,
    maxServers: 50,
    maxUsers: 25,
    maxMessagesPerMonth: undefined, // unlimited
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: true,
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
      return "text-gray-600 bg-gray-100";
    case WorkspacePlan.FREELANCE:
      return "text-blue-600 bg-blue-100";
    case WorkspacePlan.STARTUP:
      return "text-green-600 bg-green-100";
    case WorkspacePlan.BUSINESS:
      return "text-purple-600 bg-purple-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

export function canUserAccessRouting(plan: WorkspacePlan): boolean {
  return getPlanFeatures(plan).canAccessRouting;
}
