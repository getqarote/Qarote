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
  hasEmailSupport: boolean;
  hasPrioritySupport: boolean;
  hasEmailAlerts: boolean;

  // Display features (for pricing page rendering)
  hasAdvancedAnalytics: boolean;
  hasAlerts: boolean;
  hasTopologyVisualization: boolean;
  hasRoleBasedAccess: boolean | "coming_soon";
  hasAdvancedRoleBasedAccess: boolean | "coming_soon";
  hasSsoSamlOidc: boolean;
  hasSoc2Compliance: boolean;
  isPopular: boolean;

  // Intelligence & Diagnostics display features
  // "limited" = feature exists on FREE but with enforced quotas
  hasDailyDigest: boolean | "limited";
  hasMessageSpy: boolean | "limited";
  hasMetricsPersistence: boolean | "limited";
  hasIncidentDiagnosis: boolean | "limited";
  hasMessageTracing: boolean | "limited";

  // Security display features
  hasAuditLog: boolean | "coming_soon";

  // LLM display features (cloud managed by default, BYOK optional on Enterprise)
  hasLlmExplain: boolean | "coming_soon";
  llmExplainsPerMonth: number | null; // 5 / 50 / null (unlimited)
  hasLlmDigest: boolean | "coming_soon";
  canUseBYOK: boolean;

  // Retention limits (in hours)
  // Note: these are operational quotas, not billing/display features.
  // A future refactor can extract a PlanLimits type for cleaner separation.
  maxTraceRetentionHours: number;
  maxMetricsRetentionHours: number;

  // RabbitMQ version support
  supportedRabbitMqVersions: string[];
  ltsOnly: boolean;

  // Pricing (in cents)
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
    hasEmailSupport: false,
    hasPrioritySupport: false,
    hasEmailAlerts: false,

    // Display features
    hasAdvancedAnalytics: false,
    hasAlerts: false,
    hasTopologyVisualization: false,
    hasRoleBasedAccess: false,
    hasAdvancedRoleBasedAccess: false,
    hasSsoSamlOidc: false,
    hasSoc2Compliance: true,
    isPopular: false,

    // Security
    hasAuditLog: false,

    // LLM (Community: 5 explains / month — wow factor at first-time experience)
    hasLlmExplain: "coming_soon",
    llmExplainsPerMonth: 5,
    hasLlmDigest: false,
    canUseBYOK: false,

    // Intelligence & Diagnostics (limited on FREE)
    hasDailyDigest: "limited", // weekly digest only on Community
    hasMessageSpy: "limited", // 5 messages / capture (FREE_SPY_PREVIEW_COUNT)
    hasMetricsPersistence: "limited", // 24 h retention
    hasIncidentDiagnosis: "limited", // 2-finding preview per run
    hasMessageTracing: "limited", // 6 h retention — wow factor without storage burden

    // Retention limits
    maxTraceRetentionHours: 6, // 6 h — wow factor without storage cost on Community
    maxMetricsRetentionHours: 24, // 1 day (queryable range is further clamped to 6h)

    // RabbitMQ support
    supportedRabbitMqVersions: ["3.12", "3.13", "4.0", "4.1"],
    ltsOnly: true,

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
    hasCommunitySupport: true,
    hasEmailSupport: true,
    hasPrioritySupport: false,
    hasEmailAlerts: true,

    // Display features
    hasAdvancedAnalytics: true,
    hasAlerts: true,
    hasTopologyVisualization: true,
    hasRoleBasedAccess: true,
    hasAdvancedRoleBasedAccess: false,
    hasSsoSamlOidc: false,
    hasSoc2Compliance: true,
    isPopular: true,

    // Security
    hasAuditLog: false,

    // LLM (Developer: 50 explains / month included, managed by Qarote)
    hasLlmExplain: "coming_soon",
    llmExplainsPerMonth: 50,
    hasLlmDigest: false,
    canUseBYOK: false,

    // Intelligence & Diagnostics (full access on Developer)
    hasDailyDigest: true, // daily digest
    hasMessageSpy: true,
    hasMetricsPersistence: true,
    hasIncidentDiagnosis: true,
    hasMessageTracing: true,

    // Retention limits
    maxTraceRetentionHours: 168, // 7 days — user-configurable within this bound
    maxMetricsRetentionHours: 336, // 14 days

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
    ltsOnly: false,

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
    hasCommunitySupport: true,
    hasEmailSupport: false,
    hasPrioritySupport: true,
    hasEmailAlerts: true,

    // Display features
    hasAdvancedAnalytics: true,
    hasAlerts: true,
    hasTopologyVisualization: true,
    hasRoleBasedAccess: true,
    hasAdvancedRoleBasedAccess: "coming_soon",
    hasSsoSamlOidc: true,
    hasSoc2Compliance: true,
    isPopular: false,

    // Security
    hasAuditLog: true,

    // LLM (Enterprise: unlimited explains + LLM digest + BYOK option)
    hasLlmExplain: "coming_soon",
    llmExplainsPerMonth: null, // unlimited
    hasLlmDigest: "coming_soon",
    canUseBYOK: true,

    // Intelligence & Diagnostics (full access on Enterprise)
    hasDailyDigest: true, // daily + custom schedule (Soon)
    hasMessageSpy: true,
    hasMetricsPersistence: true,
    hasIncidentDiagnosis: true,
    hasMessageTracing: true,

    // Retention limits
    maxTraceRetentionHours: 720, // 30 days
    maxMetricsRetentionHours: 2160, // 90 days — quarterly capacity planning

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
    ltsOnly: false,

    // Pricing
    monthlyPrice: 12400, // $124.00
    yearlyPrice: 118800, // $1,188.00/year ($99/month)
    userCostPerMonth: 500, // $5.00 per additional user

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
