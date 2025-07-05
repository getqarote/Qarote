import { WorkspacePlan } from "@prisma/client";

export interface PlanFeatures {
  // Limits and permissions
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canExportData: boolean;
  canInviteUsers: boolean;
  maxQueues: number;
  maxServers: number;
  maxUsers: number | null;
  maxInvitations: number | null;
  maxMessagesPerMonth: number | null;
  hasAdvancedMetrics: boolean;
  hasAdvancedAlerts: boolean;
  hasPrioritySupport: boolean;

  // Memory features
  canViewBasicMemoryMetrics: boolean;
  canViewAdvancedMemoryMetrics: boolean;
  canViewExpertMemoryMetrics: boolean;
  canViewMemoryTrends: boolean;
  canViewMemoryOptimization: boolean;

  // RabbitMQ version support
  supportedRabbitMqVersions: string[];

  // Message history
  canAccessMessageHistory: boolean;
  availableRetentionPeriods: number[];
  maxMessageHistoryStorage: number;
  canConfigureRetention: boolean;

  // Pricing
  monthlyPrice: number;
  yearlyPrice: number;
  userCostPerMonth?: number;

  // Display
  displayName: string;
  description: string;
  color: string;
  featureDescriptions: string[];

  // Additional features
  canAccessRouting: boolean;
}

export const PLAN_FEATURES: Record<WorkspacePlan, PlanFeatures> = {
  [WorkspacePlan.FREE]: {
    // Limits
    canAddServer: true,
    canAddQueue: false,
    canSendMessages: false,
    canExportData: false,
    canInviteUsers: false,
    maxQueues: 1,
    maxServers: 1,
    maxUsers: 1,
    maxInvitations: 0,
    maxMessagesPerMonth: 0,
    hasAdvancedMetrics: false,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,

    // RabbitMQ support
    supportedRabbitMqVersions: ["3.12"],

    // Message history
    canAccessMessageHistory: false,
    availableRetentionPeriods: [],
    maxMessageHistoryStorage: 0,
    canConfigureRetention: false,

    // Pricing
    monthlyPrice: 0,
    yearlyPrice: 0,

    // Display
    displayName: "Free",
    description: "Perfect for getting started with RabbitMQ monitoring",
    color: "text-white bg-gray-600",
    featureDescriptions: [
      "1 RabbitMQ server",
      "Read-only queue monitoring",
      "Basic memory metrics",
      "Community support",
    ],

    // Additional
    canAccessRouting: false,
  },

  [WorkspacePlan.DEVELOPER]: {
    // Limits
    canAddServer: true,
    canAddQueue: true,
    canSendMessages: true,
    canExportData: true,
    canInviteUsers: true,
    maxQueues: 10,
    maxServers: 2,
    maxUsers: 2,
    maxInvitations: 1,
    maxMessagesPerMonth: 100,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: false,
    hasPrioritySupport: false,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: false,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: false,
    canViewMemoryOptimization: false,

    // RabbitMQ support
    supportedRabbitMqVersions: ["3.12"],

    // Message history
    canAccessMessageHistory: true,
    availableRetentionPeriods: [1],
    maxMessageHistoryStorage: 1,
    canConfigureRetention: false,

    // Pricing
    monthlyPrice: 4900,
    yearlyPrice: 3900,
    userCostPerMonth: 5,

    // Display
    displayName: "Developer",
    description: "Ideal for individual developers and small projects",
    color: "text-white bg-blue-600",
    featureDescriptions: [
      "2 RabbitMQ servers",
      "10 message queues",
      "100 messages/month",
      "Advanced memory analysis",
      "Data export capabilities",
      "1-day message history",
      "Email support",
    ],

    // Additional
    canAccessRouting: false,
  },

  [WorkspacePlan.STARTUP]: {
    // Limits
    canAddServer: true,
    canAddQueue: true,
    canSendMessages: true,
    canExportData: true,
    canInviteUsers: true,
    maxQueues: 50,
    maxServers: 10,
    maxUsers: 6,
    maxInvitations: 5,
    maxMessagesPerMonth: 1000,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: false,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: false,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,

    // RabbitMQ support
    supportedRabbitMqVersions: ["3.12", "3.13", "4.0", "4.1"],

    // Message history
    canAccessMessageHistory: true,
    availableRetentionPeriods: [1, 7, 30],
    maxMessageHistoryStorage: 5,
    canConfigureRetention: true,

    // Pricing
    monthlyPrice: 9900,
    yearlyPrice: 7900,
    userCostPerMonth: 8,

    // Display
    displayName: "Startup",
    description: "Great for growing teams and production workloads",
    color: "text-white bg-green-600",
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

    // Additional
    canAccessRouting: true,
  },

  [WorkspacePlan.BUSINESS]: {
    // Limits
    canAddServer: true,
    canAddQueue: true,
    canSendMessages: true,
    canExportData: true,
    canInviteUsers: true,
    maxQueues: 200,
    maxServers: 50,
    maxUsers: null,
    maxInvitations: null,
    maxMessagesPerMonth: null,
    hasAdvancedMetrics: true,
    hasAdvancedAlerts: true,
    hasPrioritySupport: true,

    // Memory features
    canViewBasicMemoryMetrics: true,
    canViewAdvancedMemoryMetrics: true,
    canViewExpertMemoryMetrics: true,
    canViewMemoryTrends: true,
    canViewMemoryOptimization: true,

    // RabbitMQ support
    supportedRabbitMqVersions: ["3.12", "3.13", "4.0", "4.1"],

    // Message history
    canAccessMessageHistory: true,
    availableRetentionPeriods: [1, 7, 30, 90, 180, 365],
    maxMessageHistoryStorage: 20,
    canConfigureRetention: true,

    // Pricing
    monthlyPrice: 19900,
    yearlyPrice: 15900,
    userCostPerMonth: 10,

    // Display
    displayName: "Business",
    description: "Enterprise-grade features for mission-critical systems",
    color: "text-white bg-purple-600",
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

    // Additional
    canAccessRouting: true,
  },
};

// Single source of truth getter
export function getPlanFeatures(plan: WorkspacePlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}
