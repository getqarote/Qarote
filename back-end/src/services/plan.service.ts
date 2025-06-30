import { WorkspacePlan } from "@prisma/client";
import { PLAN_LIMITS, type PlanLimits } from "./plan-validation.service";

export interface PlanFeatures extends PlanLimits {
  // Display information
  displayName: string;
  description: string;
  color: string;

  // Pricing information
  monthlyPrice: number; // in cents
  yearlyPrice: number; // in cents

  // Feature descriptions for UI
  featureDescriptions: string[];

  // UI-specific flags (derived from existing limits)
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  canAccessRouting: boolean;
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;

  // Memory features
  canViewBasicMemoryMetrics: boolean;
  canViewAdvancedMemoryMetrics: boolean;
  canViewExpertMemoryMetrics: boolean;
  canViewMemoryTrends: boolean;
  canViewMemoryOptimization: boolean;
}

export const PLAN_FEATURES: Record<WorkspacePlan, PlanFeatures> = {
  [WorkspacePlan.FREE]: {
    // Inherit from PLAN_LIMITS
    ...PLAN_LIMITS[WorkspacePlan.FREE],

    // Display information
    displayName: "Free",
    description: "Perfect for getting started with RabbitMQ monitoring",
    color: "text-white bg-gray-600",

    // Pricing
    monthlyPrice: 0,
    yearlyPrice: 0,

    // Feature descriptions
    featureDescriptions: [
      "1 RabbitMQ server",
      "Read-only queue monitoring",
      "Basic memory metrics",
      "Community support",
    ],

    // UI flags (derived from existing limits)
    canAddQueue: false,
    canSendMessages: false,
    canAddServer: true,
    canExportData: false,
    canAccessRouting: false,
    hasAdvancedMetrics: false,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,
  },

  [WorkspacePlan.DEVELOPER]: {
    // Inherit from PLAN_LIMITS
    ...PLAN_LIMITS[WorkspacePlan.DEVELOPER],

    // Display information
    displayName: "Developer",
    description: "Ideal for individual developers and small projects",
    color: "text-white bg-blue-600",

    // Pricing
    monthlyPrice: 4900, // $49.00
    yearlyPrice: 3900, // $39.00

    // Feature descriptions
    featureDescriptions: [
      "2 RabbitMQ servers",
      "10 message queues",
      "100 messages/month",
      "Advanced memory analysis",
      "Data export capabilities",
      "1-day message history",
      "Email support",
    ],

    // UI flags
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    canAccessRouting: false,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,
  },

  [WorkspacePlan.STARTUP]: {
    // Inherit from PLAN_LIMITS
    ...PLAN_LIMITS[WorkspacePlan.STARTUP],

    // Display information
    displayName: "Startup",
    description: "Great for growing teams and production workloads",
    color: "text-white bg-green-600",

    // Pricing
    monthlyPrice: 9900, // $99.00
    yearlyPrice: 7900, // $79.00

    // Feature descriptions
    featureDescriptions: [
      "10 RabbitMQ servers",
      "50 message queues",
      "1,000 messages/month",
      "Advanced analytics & alerts",
      "Routing visualization",
      "7-day message history",
      "Memory trends & optimization",
      "Priority email support",
    ],

    // UI flags
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    canAccessRouting: true,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: false,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,
  },

  [WorkspacePlan.BUSINESS]: {
    // Inherit from PLAN_LIMITS
    ...PLAN_LIMITS[WorkspacePlan.BUSINESS],

    // Display information
    displayName: "Business",
    description: "Enterprise-grade features for mission-critical systems",
    color: "text-white bg-purple-600",

    // Pricing
    monthlyPrice: 19900, // $199.00
    yearlyPrice: 15900, // $159.00

    // Feature descriptions
    featureDescriptions: [
      "Unlimited RabbitMQ servers",
      "200 message queues",
      "Unlimited messages",
      "Advanced analytics & alerts",
      "Routing visualization",
      "30-day message history",
      "Expert memory analysis",
      "Dedicated support",
      "Custom integrations",
    ],

    // UI flags
    canAddQueue: true,
    canSendMessages: true,
    canAddServer: true,
    canExportData: true,
    canAccessRouting: true,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: true,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: true,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,
  },
};

export function getUnifiedPlanFeatures(plan: WorkspacePlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}

export function getPlanDisplayName(plan: WorkspacePlan): string {
  return getUnifiedPlanFeatures(plan).displayName;
}

export function getPlanColor(plan: WorkspacePlan): string {
  return getUnifiedPlanFeatures(plan).color;
}

export function canUserAddQueue(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canAddQueue;
}

export function canUserSendMessages(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canSendMessages;
}

export function canUserAddServer(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canAddServer;
}

export function canUserAddServerWithCount(
  plan: WorkspacePlan,
  currentServerCount: number
): boolean {
  const features = getUnifiedPlanFeatures(plan);

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
  const features = getUnifiedPlanFeatures(plan);

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
  const features = getUnifiedPlanFeatures(plan);

  if (!features.canSendMessages) {
    return false;
  }

  // If maxMessagesPerMonth is null or undefined, it's unlimited
  if (
    features.maxMessagesPerMonth === null ||
    features.maxMessagesPerMonth === undefined
  ) {
    return true;
  }

  return currentMonthlyMessages < features.maxMessagesPerMonth;
}

export function getQueueLimitForPlan(plan: WorkspacePlan): number | undefined {
  return getUnifiedPlanFeatures(plan).maxQueues;
}

export function getQueueLimitText(plan: WorkspacePlan): string {
  const features = getUnifiedPlanFeatures(plan);
  if (!features.canAddQueue) {
    return "Cannot add queues";
  }
  if (features.maxQueues === undefined) {
    return "Unlimited queues";
  }
  return `Up to ${features.maxQueues} queues`;
}

export function canUserExportData(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canExportData;
}

export function getMessageLimitText(plan: WorkspacePlan): string {
  const features = getUnifiedPlanFeatures(plan);
  if (!features.canSendMessages) {
    return "Cannot send messages";
  }
  if (
    features.maxMessagesPerMonth === null ||
    features.maxMessagesPerMonth === undefined
  ) {
    return "Unlimited messages";
  }
  return `${features.maxMessagesPerMonth} messages/month`;
}

export function getMessageLimitForPlan(
  plan: WorkspacePlan
): number | undefined {
  const maxMessages = getUnifiedPlanFeatures(plan).maxMessagesPerMonth;
  return maxMessages === null ? undefined : maxMessages;
}

export function getServerLimitText(plan: WorkspacePlan): string {
  const features = getUnifiedPlanFeatures(plan);
  if (!features.canAddServer) {
    return "Cannot add servers";
  }
  if (features.maxServers === undefined) {
    return "Unlimited servers";
  }
  return `Up to ${features.maxServers} servers`;
}

export function getServerLimitForPlan(plan: WorkspacePlan): number | undefined {
  return getUnifiedPlanFeatures(plan).maxServers;
}

export function canUserAccessRouting(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canAccessRouting;
}

// Memory Features Access Control
export function canUserViewBasicMemoryMetrics(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canViewBasicMemoryMetrics;
}

export function canUserViewAdvancedMemoryMetrics(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canViewAdvancedMemoryMetrics;
}

export function canUserViewExpertMemoryMetrics(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canViewExpertMemoryMetrics;
}

export function canUserViewMemoryTrends(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canViewMemoryTrends;
}

export function canUserViewMemoryOptimization(plan: WorkspacePlan): boolean {
  return getUnifiedPlanFeatures(plan).canViewMemoryOptimization;
}

export function getMonthlyPrice(plan: WorkspacePlan): string {
  const features = getUnifiedPlanFeatures(plan);
  return formatPrice(features.monthlyPrice);
}

export function getYearlyPrice(plan: WorkspacePlan): string {
  const features = getUnifiedPlanFeatures(plan);
  return formatPrice(features.yearlyPrice);
}

export function getYearlySavings(plan: WorkspacePlan): string | null {
  const features = getUnifiedPlanFeatures(plan);
  if (features.monthlyPrice === 0 || features.yearlyPrice === 0) return null;

  const monthlyAnnual = features.monthlyPrice * 12;
  const yearlyAnnual = features.yearlyPrice * 12;
  const savings = monthlyAnnual - yearlyAnnual;

  if (savings <= 0) return null;

  return formatPrice(savings);
}

// Utility functions for pricing
function formatPrice(priceInCents: number): string {
  if (priceInCents === 0) return "Free";
  return `$${(priceInCents / 100).toFixed(0)}`;
}
