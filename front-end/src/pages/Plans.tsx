import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Check,
  Headphones,
  Shield,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import { useUser } from "@/hooks/useUser";

import { UserPlan } from "@/types/plans";

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    features: {
      servers: string;
      workspaces: string;
      teamMembers: string;
      queueManagement: boolean;
      exchangeManagement: boolean;
      virtualHostManagement: boolean;
      rabbitMQUserManagement: boolean;
      alertsNotification: boolean;
      communitySupport: boolean;
      prioritySupport: boolean;
      emailAlerts: boolean;
    };
  };
  price: string;
  period: "month" | "year";
  billingPeriod: "monthly" | "yearly";
  originalPrice?: string;
  isCurrentPlan?: boolean;
  onUpgrade: (plan: UserPlan, billingInterval: "monthly" | "yearly") => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  price,
  period,
  billingPeriod,
  originalPrice,
  isCurrentPlan,
  onUpgrade,
}) => {
  // Determine ring color: show blue ring for current plan
  const ringClass = isCurrentPlan
    ? "ring-2 ring-blue-500 shadow-lg scale-105"
    : "";

  return (
    <Card
      className={`relative ${plan.borderColor} ${ringClass} transition-all duration-200 hover:shadow-lg`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-button text-white px-4 py-1 text-sm font-medium">
            Current Plan
          </Badge>
        </div>
      )}

      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className={`text-2xl font-bold ${plan.color} mb-2`}>
            {plan.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {plan.description}
          </p>

          <div className="mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-foreground">
                {price}
              </span>
              {price !== "Free" && (
                <span className="text-muted-foreground">/{period}</span>
              )}
            </div>
            {originalPrice && (
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-muted-foreground line-through text-sm">
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
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              Core Features
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-foreground">
                    RabbitMQ Servers
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {plan.features.servers}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-foreground">Workspaces</span>
                  <div className="text-xs text-muted-foreground">
                    {plan.features.workspaces}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-foreground">Team Members</span>
                  <div className="text-xs text-muted-foreground">
                    {plan.features.teamMembers}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  {plan.features.queueManagement ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${plan.features.queueManagement ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Queue Management
                  </span>
                  <div
                    className={`text-xs ${plan.features.queueManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    Create and manage queues
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  {plan.features.exchangeManagement ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${plan.features.exchangeManagement ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Exchange Management
                  </span>
                  <div
                    className={`text-xs ${plan.features.exchangeManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    Create and manage exchanges
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  {plan.features.virtualHostManagement ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${plan.features.virtualHostManagement ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Virtual Host Management
                  </span>
                  <div
                    className={`text-xs ${plan.features.virtualHostManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    Create and manage virtual hosts
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  {plan.features.rabbitMQUserManagement ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${plan.features.rabbitMQUserManagement ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    RabbitMQ User Management
                  </span>
                  <div
                    className={`text-xs ${plan.features.rabbitMQUserManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    Create and manage RabbitMQ users
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  {plan.features.alertsNotification ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${plan.features.alertsNotification ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Alerts Notification
                  </span>
                  <div
                    className={`text-xs ${plan.features.alertsNotification ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    Real-time alerts and notifications
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              Support
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-foreground">
                    Community Support
                  </span>
                  <div className="text-xs text-muted-foreground">
                    Community forums
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  {plan.features.prioritySupport ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${plan.features.prioritySupport ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Priority Support
                  </span>
                  <div
                    className={`text-xs ${plan.features.prioritySupport ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    Priority mail support
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  {plan.features.emailAlerts ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${plan.features.emailAlerts ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Email Alerts
                  </span>
                  <div
                    className={`text-xs ${plan.features.emailAlerts ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    Critical and warning notifications
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <Button
          onClick={() => onUpgrade(plan.id as UserPlan, billingPeriod)}
          className={`w-full ${isCurrentPlan ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "text-white"}`}
          style={
            !isCurrentPlan
              ? {
                  backgroundImage:
                    "linear-gradient(to right, rgb(234 88 12), rgb(220 38 38))",
                }
              : undefined
          }
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? "Current Plan" : "Start free"}
        </Button>
      </CardContent>
    </Card>
  );
};

interface PlansPageProps {
  onUpgrade?: (plan: UserPlan, billingInterval: "monthly" | "yearly") => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ onUpgrade }) => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const navigate = useNavigate();
  const { userPlan } = useUser();

  const planPricing = {
    monthly: {
      FREE: { price: "Free", originalPrice: undefined },
      DEVELOPER: { price: "$10", originalPrice: undefined },
      ENTERPRISE: { price: "$50", originalPrice: undefined },
    },
    yearly: {
      FREE: { price: "Free", originalPrice: undefined },
      DEVELOPER: { price: "$100", originalPrice: "$120" },
      ENTERPRISE: { price: "$500", originalPrice: "$600" },
    },
  };

  const plans = [
    {
      id: "FREE",
      name: "Free",
      description: "Perfect for getting started",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: "Up to 1",
        workspaces: "Up to 1",
        teamMembers: "Up to 1",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: false,
        communitySupport: true,
        prioritySupport: false,
        emailAlerts: false,
      },
    },
    {
      id: "DEVELOPER",
      name: "Developer",
      description: "For solo developers and small projects",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      features: {
        servers: "Up to 2",
        workspaces: "Up to 2",
        teamMembers: "Up to 2",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: false,
        emailAlerts: true,
      },
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      description: "For large teams and enterprises",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: "Unlimited",
        workspaces: "Unlimited",
        teamMembers: "Unlimited",
        queueManagement: true,
        exchangeManagement: true,
        virtualHostManagement: true,
        rabbitMQUserManagement: true,
        alertsNotification: true,
        communitySupport: true,
        prioritySupport: true,
        emailAlerts: true,
      },
    },
  ];

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
              <PlanBadge />
            </div>

            {/* Pricing Section - matching landing page */}
            <div className="py-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Simple, transparent pricing
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Scale your RabbitMQ monitoring with plans designed for teams
                  of all sizes.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="flex justify-center mb-12">
                <div className="grid md:grid-cols-4 gap-6 max-w-4xl">
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-blue-100 p-3 rounded-full mb-3">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Live Monitoring
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Monitor your RabbitMQ servers with second precision
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-purple-100 p-3 rounded-full mb-3">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Smart Analytics
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Insights and memory optimization tips
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-green-100 p-3 rounded-full mb-3">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Enterprise Security
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      SOC 2 compliant with enterprise-grade encryption
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-orange-100 p-3 rounded-full mb-3">
                      <Headphones className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      24/7 Support
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Expert support when you need it most
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4 mb-16">
                <span
                  className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
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
                    billingPeriod === "yearly" ? "bg-blue-600" : "bg-muted"
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
                  className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  Yearly
                </span>
                {billingPeriod === "yearly" && (
                  <Badge className="bg-green-100 text-green-800">
                    Save 20%
                  </Badge>
                )}
              </div>

              {/* Plans Grid */}
              <div className="flex justify-center">
                <div className="grid lg:grid-cols-3 gap-8 max-w-5xl">
                  {plans.map((plan) => {
                    const currentPricing =
                      planPricing[billingPeriod][
                        plan.id as keyof typeof planPricing.monthly
                      ];
                    const isCurrentPlan = plan.id === userPlan?.toUpperCase();

                    return (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        price={currentPricing.price}
                        originalPrice={currentPricing.originalPrice}
                        period={billingPeriod === "monthly" ? "month" : "year"}
                        billingPeriod={billingPeriod}
                        isCurrentPlan={isCurrentPlan}
                        onUpgrade={onUpgrade || (() => {})}
                      />
                    );
                  })}
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

  return <PlansPage onUpgrade={handleUpgrade} />;
};

export default Plans;
