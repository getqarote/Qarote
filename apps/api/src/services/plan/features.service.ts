import { UserPlan } from "@/generated/prisma/client";

export interface PlanFeatures {
  // Core permissions
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddServer: boolean;
  canAddExchange: boolean;
  canAddVirtualHost: boolean;
  canAddRabbitMQUser: boolean;
  canInviteUsers: boolean;

  // Limits
  maxServers: number | null;
  maxWorkspaces: number | null;
  maxUsers: number | null;
  maxInvitations: number | null;

  // Support features
  hasCommunitySupport: boolean;
  hasPrioritySupport: boolean;
  hasEmailAlerts: boolean;

  // RabbitMQ version support
  supportedRabbitMqVersions: string[];

  // Pricing
  monthlyPrice: number;
  yearlyPrice: number;
  userCostPerMonth?: number;

  // Display
  displayName: string;
  description: string;
  color: string;
  featureDescriptions: string[];
}

export const PLAN_FEATURES: Record<UserPlan, PlanFeatures> = {
  [UserPlan.FREE]: {
    // Core permissions
    canAddServer: true,
    canAddQueue: true,
    canSendMessages: true,
    canAddExchange: true,
    canAddVirtualHost: true,
    canAddRabbitMQUser: true,
    canInviteUsers: false,

    // Limits
    maxServers: 1,
    maxWorkspaces: 1,
    maxUsers: 1,
    maxInvitations: 0,

    // Support features
    hasCommunitySupport: true,
    hasPrioritySupport: false,
    hasEmailAlerts: false,

    // RabbitMQ support
    supportedRabbitMqVersions: ["3.12", "3.13", "4.0", "4.1"],

    // Pricing
    monthlyPrice: 0,
    yearlyPrice: 0,

    // Display
    displayName: "Free",
    description: "Perfect for getting started with RabbitMQ monitoring",
    color: "text-white bg-gray-600",
    featureDescriptions: [
      "1 RabbitMQ server",
      "1 workspace",
      "1 user",
      "Queue management",
      "Exchange management",
      "Virtual host management",
      "RabbitMQ user management",
      "Mail support",
      "Community support",
    ],
  },

  [UserPlan.DEVELOPER]: {
    // Core permissions
    canAddServer: true,
    canAddQueue: true,
    canSendMessages: true,
    canAddExchange: true,
    canAddVirtualHost: true,
    canAddRabbitMQUser: true,
    canInviteUsers: true,

    // Limits
    maxServers: 2,
    maxWorkspaces: 2,
    maxUsers: 2,
    maxInvitations: 1,

    // Support features
    hasCommunitySupport: true,
    hasPrioritySupport: false,
    hasEmailAlerts: true,

    // RabbitMQ support
    supportedRabbitMqVersions: [
      "3.13",
      "3.12",
      "3.11",
      "3.10",
      "3.9",
      "3.8",
      "3.7",
      "3.6",
      "3.5",
      "3.4",
      "3.3",
      "3.2",
      "3.1",
      "3.0",
      "4.0",
      "4.1",
      "4.2",
    ],

    // Pricing
    monthlyPrice: 1000, // $10.00
    yearlyPrice: 10000, // $100.00 (roughly $8.33/month)

    // Display
    displayName: "Developer",
    description: "Ideal for individual developers and small projects",
    color: "text-white bg-blue-600",
    featureDescriptions: [
      "2 RabbitMQ servers",
      "2 workspaces",
      "2 users",
      "Can add exchanges, virtual hosts, and RabbitMQ users",
      "Can add queues",
      "Community support",
      "Email alerts for critical and warning notifications",
    ],
  },

  [UserPlan.ENTERPRISE]: {
    // Core permissions
    canAddServer: true,
    canAddQueue: true,
    canSendMessages: true,
    canAddExchange: true,
    canAddVirtualHost: true,
    canAddRabbitMQUser: true,
    canInviteUsers: true,

    // Limits
    maxServers: null, // unlimited
    maxWorkspaces: null, // unlimited
    maxUsers: null, // unlimited
    maxInvitations: null, // unlimited

    // Support features
    hasCommunitySupport: true,
    hasPrioritySupport: true,
    hasEmailAlerts: true,

    // RabbitMQ support
    supportedRabbitMqVersions: [
      "3.13",
      "3.12",
      "3.11",
      "3.10",
      "3.9",
      "3.8",
      "3.7",
      "3.6",
      "3.5",
      "3.4",
      "3.3",
      "3.2",
      "3.1",
      "3.0",
      "4.0",
      "4.1",
      "4.2",
    ],

    // Pricing
    monthlyPrice: 5000, // $50.00
    yearlyPrice: 50000, // $500.00 (roughly $41.67/month)
    userCostPerMonth: 500, // $5.00 per additional user

    // Display
    displayName: "Enterprise",
    description: "Enterprise-grade features for mission-critical systems",
    color: "text-white bg-purple-600",
    featureDescriptions: [
      "Unlimited RabbitMQ servers",
      "Unlimited workspaces",
      "Unlimited users",
      "Can add exchanges, virtual hosts, and RabbitMQ users",
      "Can add queues",
      "Priority mail support",
      "Email alerts for critical and warning notifications",
    ],
  },
};

// Single source of truth getter
export function getPlanFeatures(plan: UserPlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}
