import { UserPlan } from "@/generated/prisma/client";

/**
 * Broker versions Qarote can monitor. A DOMAIN RULE, not a plan limit —
 * every plan gets the same list, and no tier unlocks a version. Refusing a
 * broker reads as an incompatibility, which is not something a customer
 * upgrades to fix.
 */
export const SUPPORTED_RABBITMQ_VERSIONS = [
  "3.0",
  "3.1",
  "3.2",
  "3.3",
  "3.4",
  "3.5",
  "3.6",
  "3.7",
  "3.8",
  "3.9",
  "3.10",
  "3.11",
  "3.12",
  "3.13",
  "4.0",
  "4.1",
  "4.2",
];

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
  hasPrioritySupport: boolean;

  // Display features (for pricing page rendering)
  hasAdvancedAnalytics: boolean;
  hasAlerts: boolean;
  isPopular: boolean;

  // Intelligence & Diagnostics display features
  // "limited" = feature exists on FREE but with enforced quotas

  // LLM display features (cloud managed by default, BYOK optional on Enterprise)
  llmExplainsPerMonth: number | null; // 5 / 50 / null (unlimited)

  // Per-plan trace QUERY window cap (in hours). Not a storage knob — trace
  // storage is a uniform 7-day TimescaleDB chunk-drop. This gates how far back
  // each plan may query the firehose (FREE = 6h preview lever).
  // Note: this is an operational quota, not a billing/display feature.
  maxTraceRetentionHours: number;

  // RabbitMQ version support
  supportedRabbitMqVersions: string[];

  // Pricing (in cents)
  monthlyPrice: number;
  yearlyPrice: number;

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
    hasPrioritySupport: false,

    // Display features
    hasAdvancedAnalytics: false,
    hasAlerts: false,
    isPopular: false,

    // LLM (Community: 5 explains / month — wow factor at first-time experience)
    llmExplainsPerMonth: 5,

    // Trace query window — 6h preview (wow factor without storage cost).
    // Metrics query window is a separate FREE 6h cap in resolve-allowed-range.
    maxTraceRetentionHours: 6,

    // RabbitMQ support
    supportedRabbitMqVersions: SUPPORTED_RABBITMQ_VERSIONS,

    // Pricing
    monthlyPrice: 0,
    yearlyPrice: 0,

    // Display
    displayName: "Free",
    description: "Perfect for getting started",
    color: "text-white bg-gray-600",
    featureDescriptions: [
      "1 RabbitMQ server",
      "1 workspace",
      "1 user",
      "Queue management",
      "Exchange management",
      "Virtual host management",
      "RabbitMQ user management",
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
    maxServers: 3,
    maxWorkspaces: 3,
    maxUsers: 3,
    maxInvitations: 2,

    // Support features
    hasPrioritySupport: false,

    // Display features
    hasAdvancedAnalytics: true,
    hasAlerts: true,
    isPopular: true,

    // LLM (Developer: 50 explains / month included, managed by Qarote)
    llmExplainsPerMonth: 50,

    // Trace query window — full 7-day storage window is queryable.
    maxTraceRetentionHours: 168,

    // RabbitMQ support
    supportedRabbitMqVersions: SUPPORTED_RABBITMQ_VERSIONS,

    // Pricing
    monthlyPrice: 3400, // $34.00
    yearlyPrice: 34800, // $348.00/year ($29/month)

    // Display
    displayName: "Developer",
    description: "For solo developers and small projects",
    color: "text-white bg-blue-600",
    featureDescriptions: [
      "3 RabbitMQ servers",
      "3 workspaces",
      "3 users",
      "Queue, Exchange, VHost & User management",
      "Alerts & webhooks",
      "Email support",
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
    hasPrioritySupport: true,

    // Display features
    hasAdvancedAnalytics: true,
    hasAlerts: true,
    isPopular: false,

    // LLM (Enterprise: unlimited explains + LLM digest + BYOK option)
    llmExplainsPerMonth: null, // unlimited

    // Trace query window — the full 7-day storage window. Kept at 168h (not
    // higher) so a 30-day request can't silently return only the 7 days that
    // actually exist; trace storage is a uniform 7-day chunk-drop for every plan.
    maxTraceRetentionHours: 168,

    // RabbitMQ support
    supportedRabbitMqVersions: SUPPORTED_RABBITMQ_VERSIONS,

    // Pricing
    monthlyPrice: 12400, // $124.00
    yearlyPrice: 118800, // $1,188.00/year ($99/month)

    // Display
    displayName: "Enterprise",
    description: "For large teams and enterprises",
    color: "text-white bg-purple-600",
    featureDescriptions: [
      "Unlimited RabbitMQ servers",
      "Unlimited workspaces",
      "Unlimited users",
      "Queue, Exchange, VHost & User management",
      "Alerts & webhooks",
      "Priority support",
      "SSO, SAML & OIDC",
      "Email alerts for critical and warning notifications",
    ],
  },
};

// Single source of truth getter
export function getPlanFeatures(plan: UserPlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}
