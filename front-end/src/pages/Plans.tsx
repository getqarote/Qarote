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
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspacePlan } from "@/types/plans";
import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PlanBadge } from "@/components/ui/PlanBadge";

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
    queryFn: () => apiClient.getAllPlans(),
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
    [WorkspacePlan.ENTERPRISE]: {
      name: "Enterprise",
      description: "For large teams and enterprises",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
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
          name: "Workspaces",
          value: planFeatures.maxWorkspaces
            ? `Up to ${planFeatures.maxWorkspaces}`
            : "Unlimited",
          included: true,
        },
        {
          name: "Team Members",
          value: planFeatures.maxUsers
            ? `Up to ${planFeatures.maxUsers}`
            : "Unlimited",
          included: true,
        },
        {
          name: "Queue Management",
          value: "Create and manage queues",
          included: planFeatures.canAddQueue,
        },
        {
          name: "Exchange Management",
          value: "Create and manage exchanges",
          included: planFeatures.canAddExchange,
        },
        {
          name: "Virtual Host Management",
          value: "Create and manage virtual hosts",
          included: planFeatures.canAddVirtualHost,
        },
        {
          name: "RabbitMQ User Management",
          value: "Create and manage RabbitMQ users",
          included: planFeatures.canAddRabbitMQUser,
        },
      ],
    },
    {
      category: "Support",
      items: [
        {
          name: "Community Support",
          value: "Community forums",
          included: planFeatures.hasCommunitySupport,
        },
        {
          name: "Priority Support",
          value: "Priority mail support",
          included: planFeatures.hasPrioritySupport,
        },
        {
          name: "Email Alerts",
          value: "Critical and warning notifications",
          included: planFeatures.hasEmailAlerts,
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
  const navigate = useNavigate();
  const { workspacePlan } = useWorkspace();

  const planPricing = {
    monthly: {
      [WorkspacePlan.FREE]: { price: "Free", originalPrice: undefined },
      [WorkspacePlan.DEVELOPER]: { price: "$10", originalPrice: undefined },
      [WorkspacePlan.ENTERPRISE]: { price: "$50", originalPrice: undefined },
    },
    yearly: {
      [WorkspacePlan.FREE]: { price: "Free", originalPrice: undefined },
      [WorkspacePlan.DEVELOPER]: { price: "$100", originalPrice: "$120" },
      [WorkspacePlan.ENTERPRISE]: { price: "$500", originalPrice: "$600" },
    },
  };

  const currentPricing = planPricing[billingPeriod];

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <button
                  onClick={() => navigate("/profile?tab=plans")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Profile"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="title-page">Choose Your Plan</h1>
                  <p className="text-gray-500">
                    Scale your RabbitMQ monitoring with plans designed for teams
                    of all sizes.
                  </p>
                </div>
              </div>
              <PlanBadge workspacePlan={workspacePlan} />
            </div>

            {/* Hero Section */}
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Scale your RabbitMQ monitoring
                </h2>
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  From individual developers to enterprise teams, we have you
                  covered.
                </p>

                {/* Feature Highlights */}
                <div className="flex justify-center">
                  <div className="grid md:grid-cols-4 gap-6 mb-12 max-w-4xl">
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
                      <h3 className="font-semibold text-gray-900 mb-1">
                        24/7 Support
                      </h3>
                      <p className="text-sm text-gray-600 text-center">
                        Expert support when you need it most
                      </p>
                    </div>
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
                        billingPeriod === "yearly"
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-gray-900" : "text-gray-500"}`}
                  >
                    Yearly
                  </span>
                  {billingPeriod === "yearly" && (
                    <Badge className="bg-green-100 text-green-800">
                      Save 20%
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="space-y-8 mb-16">
              <div className="flex justify-center">
                <div className="grid lg:grid-cols-3 gap-8 max-w-5xl">
                  {Object.values(WorkspacePlan).map((plan) => (
                    <PlanCard
                      key={plan}
                      plan={plan}
                      price={currentPricing[plan].price}
                      originalPrice={currentPricing[plan].originalPrice}
                      period={billingPeriod === "monthly" ? "month" : "year"}
                      billingPeriod={billingPeriod}
                      isPopular={plan === WorkspacePlan.DEVELOPER}
                      isCurrentPlan={plan === currentPlan}
                      onUpgrade={onUpgrade}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

// Default export for lazy loading
const Plans: React.FC = () => {
  const { handleUpgrade } = usePlanUpgrade();
  const { workspace } = useWorkspace();

  return (
    <PlansPage
      currentPlan={workspace?.plan as WorkspacePlan}
      onUpgrade={handleUpgrade}
    />
  );
};

export default Plans;
