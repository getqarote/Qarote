import React, { useState } from "react";
import {
  Check,
  X,
  Star,
  Zap,
  Users,
  Server,
  MessageSquare,
  TrendingUp,
  Shield,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspacePlan } from "@/types/plans";
import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PlanCardProps {
  plan: WorkspacePlan;
  price: string;
  period: "month" | "year";
  billingPeriod: "monthly" | "yearly";
  originalPrice?: string;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onUpgrade: (
    plan: WorkspacePlan,
    billingInterval: "monthly" | "yearly"
  ) => void;
}

// Hook to fetch all plans data
const useAllPlans = () => {
  const { workspace } = useWorkspace();

  return useQuery({
    queryKey: ["plans", "all", workspace?.id],
    queryFn: () => apiClient.getAllPlans(workspace!.id),
    enabled: !!workspace?.id,
  });
};

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  price,
  period,
  billingPeriod,
  originalPrice,
  isPopular,
  isCurrentPlan,
  onUpgrade,
}) => {
  const { data: plansData } = useAllPlans();

  // Find the plan features for this specific plan
  const planFeatures = plansData?.plans.find((p) => p.plan === plan);

  if (!planFeatures) {
    return <div>Loading plan details...</div>;
  }

  const planConfig = {
    [WorkspacePlan.FREE]: {
      name: "Free",
      description: "Perfect for getting started",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
    [WorkspacePlan.DEVELOPER]: {
      name: "Developer",
      description: "For solo developers and small projects",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    [WorkspacePlan.STARTUP]: {
      name: "Startup",
      description: "For growing teams and businesses",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    [WorkspacePlan.BUSINESS]: {
      name: "Business",
      description: "For large teams and enterprises",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
  };

  const config = planConfig[plan];

  const planFeatureList = [
    {
      category: "Core Features",
      items: [
        {
          name: "RabbitMQ Servers",
          value: planFeatures.maxServers
            ? `Up to ${planFeatures.maxServers}`
            : planFeatures.canAddServer
              ? "Unlimited"
              : "1 server",
          included: planFeatures.canAddServer,
        },
        {
          name: "Message Queues",
          value: planFeatures.maxQueues
            ? `Up to ${planFeatures.maxQueues}`
            : "Unlimited",
          included: planFeatures.canAddQueue,
        },
        {
          name: "Monthly Messages",
          value: planFeatures.maxMessagesPerMonth
            ? `${planFeatures.maxMessagesPerMonth.toLocaleString()}`
            : planFeatures.canSendMessages
              ? "Unlimited"
              : "View only",
          included: planFeatures.canSendMessages,
        },
        {
          name: "Team Members",
          value: planFeatures.maxUsers
            ? `Up to ${planFeatures.maxUsers}`
            : "Unlimited",
          included: true,
        },
      ],
    },
    {
      category: "Advanced Features",
      items: [
        {
          name: "Message Routing",
          value: "Full routing capabilities",
          included: planFeatures.canAccessRouting,
        },
        {
          name: "Data Export",
          value: "Export all data",
          included: planFeatures.canExportData,
        },
        {
          name: "Advanced Metrics",
          value: "Detailed analytics",
          included: planFeatures.hasAdvancedMetrics,
        },
        {
          name: "Smart Alerts",
          value: "AI-powered alerts",
          included: planFeatures.hasAdvancedAlerts,
        },
      ],
    },
    {
      category: "Memory & Performance",
      items: [
        {
          name: "Basic Memory Metrics",
          value: "Memory usage overview",
          included: planFeatures.canViewBasicMemoryMetrics,
        },
        {
          name: "Advanced Memory Analysis",
          value: "Detailed memory insights",
          included: planFeatures.canViewAdvancedMemoryMetrics,
        },
        {
          name: "Expert Memory Diagnostics",
          value: "Deep memory analysis",
          included: planFeatures.canViewExpertMemoryMetrics,
        },
        {
          name: "Memory Trends",
          value: "Historical memory data",
          included: planFeatures.canViewMemoryTrends,
        },
        {
          name: "Memory Optimization",
          value: "Auto-optimization tips",
          included: planFeatures.canViewMemoryOptimization,
        },
      ],
    },
    {
      category: "Support",
      items: [
        {
          name: "Community Support",
          value: "Community forums",
          included: true,
        },
        {
          name: "Priority Support",
          value: "24/7 priority support",
          included: planFeatures.hasPrioritySupport,
        },
      ],
    },
  ];

  return (
    <Card
      className={`relative ${config.borderColor} ${isPopular ? "ring-2 ring-purple-500 shadow-lg scale-105" : ""} ${isCurrentPlan ? "ring-2 ring-green-500" : ""} transition-all duration-200 hover:shadow-lg`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-purple-500 text-white px-4 py-1 text-sm font-medium">
            <Star className="w-4 h-4 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <Badge className="bg-green-500 text-white px-3 py-1 text-sm font-medium">
            Current Plan
          </Badge>
        </div>
      )}

      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className={`text-2xl font-bold ${config.color} mb-2`}>
            {config.name}
          </h3>
          <p className="text-gray-600 text-sm mb-4">{config.description}</p>

          <div className="mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-gray-900">{price}</span>
              {price !== "Free" && (
                <span className="text-gray-600">/{period}</span>
              )}
            </div>
            {originalPrice && (
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-gray-400 line-through text-sm">
                  {originalPrice}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Save 20%
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 mb-6">
          {planFeatureList.map((category) => (
            <div key={category.category}>
              <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                {category.category}
              </h4>
              <ul className="space-y-2">
                {category.items.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-1">
                      {item.included ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-sm ${item.included ? "text-gray-900" : "text-gray-400"}`}
                      >
                        {item.name}
                      </span>
                      <div
                        className={`text-xs ${item.included ? "text-gray-600" : "text-gray-400"}`}
                      >
                        {item.value}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Button
          onClick={() => onUpgrade(plan, billingPeriod)}
          className={`w-full ${isCurrentPlan ? "bg-gray-100 text-gray-600 cursor-not-allowed" : isPopular ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}`}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan
            ? "Current Plan"
            : plan === WorkspacePlan.FREE
              ? "Get Started"
              : "Upgrade Now"}
        </Button>
      </CardContent>
    </Card>
  );
};

interface PlansPageProps {
  currentPlan?: WorkspacePlan;
  onUpgrade?: (
    plan: WorkspacePlan,
    billingInterval: "monthly" | "yearly"
  ) => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({
  currentPlan = WorkspacePlan.FREE,
  onUpgrade = () => {},
}) => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const planPricing = {
    monthly: {
      [WorkspacePlan.FREE]: { price: "Free", originalPrice: undefined },
      [WorkspacePlan.DEVELOPER]: { price: "$49", originalPrice: undefined },
      [WorkspacePlan.STARTUP]: { price: "$99", originalPrice: undefined },
      [WorkspacePlan.BUSINESS]: { price: "$249", originalPrice: undefined },
    },
    yearly: {
      [WorkspacePlan.FREE]: { price: "Free", originalPrice: undefined },
      [WorkspacePlan.DEVELOPER]: { price: "$39", originalPrice: "$49" },
      [WorkspacePlan.STARTUP]: { price: "$79", originalPrice: "$99" },
      [WorkspacePlan.BUSINESS]: { price: "$199", originalPrice: "$249" },
    },
  };

  const currentPricing = planPricing[billingPeriod];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="pt-16 pb-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Choose the right plan for your team
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Scale your RabbitMQ monitoring with plans designed for teams of all
            sizes. From individual developers to enterprise teams, we have you
            covered.
          </p>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-4 gap-6 mb-12 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-4">
              <div className="bg-blue-100 p-3 rounded-full mb-3">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Real-time Monitoring
              </h3>
              <p className="text-sm text-gray-600 text-center">
                Monitor your RabbitMQ servers with millisecond precision
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="bg-purple-100 p-3 rounded-full mb-3">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Smart Analytics
              </h3>
              <p className="text-sm text-gray-600 text-center">
                AI-powered insights and memory optimization tips
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="bg-green-100 p-3 rounded-full mb-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Enterprise Security
              </h3>
              <p className="text-sm text-gray-600 text-center">
                SOC 2 compliant with enterprise-grade encryption
              </p>
            </div>
            <div className="flex flex-col items-center p-4">
              <div className="bg-orange-100 p-3 rounded-full mb-3">
                <Headphones className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">24/7 Support</h3>
              <p className="text-sm text-gray-600 text-center">
                Expert support when you need it most
              </p>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span
              className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-gray-900" : "text-gray-500"}`}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingPeriod(
                  billingPeriod === "monthly" ? "yearly" : "monthly"
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingPeriod === "yearly" ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingPeriod === "yearly" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-gray-900" : "text-gray-500"}`}
            >
              Yearly
            </span>
            {billingPeriod === "yearly" && (
              <Badge className="bg-green-100 text-green-800">Save 20%</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {Object.values(WorkspacePlan).map((plan) => (
              <PlanCard
                key={plan}
                plan={plan}
                price={currentPricing[plan].price}
                originalPrice={currentPricing[plan].originalPrice}
                period={billingPeriod === "monthly" ? "month" : "year"}
                billingPeriod={billingPeriod}
                isPopular={plan === WorkspacePlan.STARTUP}
                isCurrentPlan={plan === currentPlan}
                onUpgrade={onUpgrade}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="px-4 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Compare all features
            </h2>
            <p className="text-gray-600">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">
                      Features
                    </th>
                    {Object.values(WorkspacePlan).map((plan) => {
                      const planConfig = {
                        [WorkspacePlan.FREE]: {
                          name: "Free",
                          color: "text-gray-600",
                        },
                        [WorkspacePlan.DEVELOPER]: {
                          name: "Developer",
                          color: "text-blue-600",
                        },
                        [WorkspacePlan.STARTUP]: {
                          name: "Startup",
                          color: "text-purple-600",
                        },
                        [WorkspacePlan.BUSINESS]: {
                          name: "Business",
                          color: "text-green-600",
                        },
                      };
                      return (
                        <th
                          key={plan}
                          className="px-6 py-4 text-center min-w-[140px]"
                        >
                          <div
                            className={`font-semibold ${planConfig[plan].color}`}
                          >
                            {planConfig[plan].name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {currentPricing[plan].price}
                            {currentPricing[plan].price !== "Free" && (
                              <span>
                                /{billingPeriod === "monthly" ? "mo" : "yr"}
                              </span>
                            )}
                          </div>
                          {plan === currentPlan && (
                            <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                              Current
                            </Badge>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    {
                      category: "Infrastructure",
                      features: [
                        {
                          name: "RabbitMQ Servers",
                          values: {
                            [WorkspacePlan.FREE]: "1 server",
                            [WorkspacePlan.DEVELOPER]: "Up to 3 servers",
                            [WorkspacePlan.STARTUP]: "Up to 10 servers",
                            [WorkspacePlan.BUSINESS]: "Unlimited servers",
                          },
                        },
                        {
                          name: "Message Queues",
                          values: {
                            [WorkspacePlan.FREE]: "Up to 5 queues",
                            [WorkspacePlan.DEVELOPER]: "Up to 25 queues",
                            [WorkspacePlan.STARTUP]: "Up to 100 queues",
                            [WorkspacePlan.BUSINESS]: "Unlimited queues",
                          },
                        },
                        {
                          name: "Monthly Messages",
                          values: {
                            [WorkspacePlan.FREE]: "10K messages",
                            [WorkspacePlan.DEVELOPER]: "100K messages",
                            [WorkspacePlan.STARTUP]: "1M messages",
                            [WorkspacePlan.BUSINESS]: "Unlimited messages",
                          },
                        },
                        {
                          name: "Team Members",
                          values: {
                            [WorkspacePlan.FREE]: "1 member",
                            [WorkspacePlan.DEVELOPER]: "Up to 3 members",
                            [WorkspacePlan.STARTUP]: "Up to 10 members",
                            [WorkspacePlan.BUSINESS]: "Unlimited members",
                          },
                        },
                      ],
                    },
                    {
                      category: "Monitoring & Analytics",
                      features: [
                        {
                          name: "Basic Memory Metrics",
                          values: {
                            [WorkspacePlan.FREE]: true,
                            [WorkspacePlan.DEVELOPER]: true,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Advanced Memory Analysis",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: true,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Expert Memory Diagnostics",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Memory Trends & History",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Memory Optimization Tips",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: false,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Advanced Metrics Dashboard",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                      ],
                    },
                    {
                      category: "Advanced Features",
                      features: [
                        {
                          name: "Message Routing",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: true,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Data Export",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: true,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Smart Alerts & Notifications",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "API Access",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: "Basic API",
                            [WorkspacePlan.STARTUP]: "Full API",
                            [WorkspacePlan.BUSINESS]: "Full API + Webhooks",
                          },
                        },
                        {
                          name: "Custom Integrations",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: false,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                      ],
                    },
                    {
                      category: "Security & Compliance",
                      features: [
                        {
                          name: "SSL/TLS Encryption",
                          values: {
                            [WorkspacePlan.FREE]: true,
                            [WorkspacePlan.DEVELOPER]: true,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Role-based Access Control",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Audit Logs",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: false,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "SOC 2 Compliance",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: false,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                      ],
                    },
                    {
                      category: "Support",
                      features: [
                        {
                          name: "Community Support",
                          values: {
                            [WorkspacePlan.FREE]: true,
                            [WorkspacePlan.DEVELOPER]: true,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Email Support",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: true,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Priority Support",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: true,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Phone Support",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: false,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                        {
                          name: "Dedicated Account Manager",
                          values: {
                            [WorkspacePlan.FREE]: false,
                            [WorkspacePlan.DEVELOPER]: false,
                            [WorkspacePlan.STARTUP]: false,
                            [WorkspacePlan.BUSINESS]: true,
                          },
                        },
                      ],
                    },
                  ].map((section, sectionIndex) => (
                    <React.Fragment key={section.category}>
                      <tr className="bg-gray-50">
                        <td
                          colSpan={5}
                          className="px-6 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide"
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.features.map((feature, featureIndex) => (
                        <tr
                          key={`${sectionIndex}-${featureIndex}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {feature.name}
                          </td>
                          {Object.values(WorkspacePlan).map((plan) => (
                            <td key={plan} className="px-6 py-4 text-center">
                              {typeof feature.values[plan] === "boolean" ? (
                                feature.values[plan] ? (
                                  <Check className="w-5 h-5 text-green-500 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-gray-300 mx-auto" />
                                )
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {feature.values[plan]}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTA Row */}
            <div className="bg-gray-50 px-6 py-6">
              <div className="flex justify-center gap-4">
                {Object.values(WorkspacePlan).map((plan) => (
                  <div key={plan} className="flex-1 max-w-[140px]">
                    <Button
                      onClick={() => onUpgrade(plan, billingPeriod)}
                      className={`w-full text-sm ${
                        plan === currentPlan
                          ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                          : plan === WorkspacePlan.STARTUP
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      disabled={plan === currentPlan}
                      size="sm"
                    >
                      {plan === currentPlan
                        ? "Current"
                        : plan === WorkspacePlan.FREE
                          ? "Get Started"
                          : "Upgrade"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="px-4 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Trusted by teams worldwide
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            <div className="flex items-center justify-center">
              <Server className="w-8 h-8 text-gray-400 mr-2" />
              <span className="text-lg font-semibold text-gray-600">50K+</span>
            </div>
            <div className="flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-400 mr-2" />
              <span className="text-lg font-semibold text-gray-600">1B+</span>
            </div>
            <div className="flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400 mr-2" />
              <span className="text-lg font-semibold text-gray-600">10K+</span>
            </div>
            <div className="flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-gray-400 mr-2" />
              <span className="text-lg font-semibold text-gray-600">99.9%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-2 text-xs text-gray-500">
            <div>Servers Monitored</div>
            <div>Messages Processed</div>
            <div>Happy Users</div>
            <div>Uptime</div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What our customers say
            </h2>
            <p className="text-gray-600">
              Don't just take our word for it - hear from teams using Rabbit
              Scout
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "Rabbit Scout transformed how we monitor our RabbitMQ infrastructure. The memory insights alone saved us thousands in optimization costs.",
                author: "Sarah Chen",
                role: "Senior DevOps Engineer",
                company: "TechCorp",
              },
              {
                quote:
                  "The smart alerts feature caught a critical memory leak before it brought down our production system. Absolutely essential for any RabbitMQ deployment.",
                author: "Marcus Rodriguez",
                role: "Platform Architect",
                company: "DataFlow Inc",
              },
              {
                quote:
                  "Finally, a monitoring tool that actually understands RabbitMQ. The routing features and advanced metrics give us the visibility we need.",
                author: "Emily Thompson",
                role: "CTO",
                company: "MessageQueue Pro",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="p-6 bg-gray-50 border-0">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div className="border-t pt-4">
                  <div className="font-semibold text-gray-900">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.company}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="grid gap-6">
            {[
              {
                question: "Can I change my plan at any time?",
                answer:
                  "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.",
              },
              {
                question: "What happens if I exceed my message limit?",
                answer:
                  "We'll notify you when you're approaching your limit. You can upgrade your plan or additional messages will be charged at standard rates.",
              },
              {
                question: "Do you offer custom enterprise plans?",
                answer:
                  "Yes, we offer custom enterprise plans for large organizations with specific requirements. Contact our sales team for more information.",
              },
              {
                question: "Is there a free trial available?",
                answer:
                  "The Free plan is available forever with no time limit. Paid plans include a 14-day money-back guarantee.",
              },
              {
                question: "What payment methods do you accept?",
                answer:
                  "We accept all major credit cards, PayPal, and can arrange wire transfers for enterprise customers.",
              },
              {
                question: "How secure is my data?",
                answer:
                  "We use enterprise-grade security with SSL/TLS encryption, regular security audits, and SOC 2 compliance for Business plans.",
              },
            ].map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="px-4 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to supercharge your RabbitMQ monitoring?
            </h2>
            <p className="text-blue-100 mb-6 text-lg">
              Join thousands of teams already using Rabbit Scout to optimize
              their message infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() =>
                  onUpgrade(WorkspacePlan.DEVELOPER, billingPeriod)
                }
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
              >
                Start Free Trial
              </Button>
              <Button
                onClick={() => onUpgrade(WorkspacePlan.STARTUP, billingPeriod)}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
              >
                View Startup Plan
              </Button>
            </div>
            <p className="text-blue-200 text-sm mt-4">
              No credit card required • 14-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Default export for lazy loading
const Plans: React.FC = () => {
  const { handleUpgrade } = usePlanUpgrade();

  return <PlansPage onUpgrade={handleUpgrade} />;
};

export default Plans;
