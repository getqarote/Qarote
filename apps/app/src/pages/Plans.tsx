import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

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

import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

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
      rabbitMQVersionSupport: string;
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
  originalPrice?: string;
  isCurrentPlan?: boolean;
  onUpgrade: (plan: UserPlan, billingInterval: "monthly" | "yearly") => void;
  billingInterval: "monthly" | "yearly";
  isUpgrading?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  price,
  period,
  originalPrice,
  isCurrentPlan,
  onUpgrade,
  billingInterval,
  isUpgrading,
}) => {
  const { t } = useTranslation("billing");

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
            {t("plans.currentPlan")}
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
              {price !== t("plans.pricing.free") && (
                <span className="text-muted-foreground">/{period}</span>
              )}
            </div>
            {originalPrice && (
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-muted-foreground line-through text-sm">
                  {originalPrice}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {t("plans.save20")}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 mb-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.coreFeatures")}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-foreground">
                    {t("plans.features.rabbitMQServers")}
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
                  <span className="text-sm text-foreground">
                    {t("plans.features.rabbitMQVersionSupport")}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {plan.features.rabbitMQVersionSupport}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-foreground">
                    {t("plans.features.workspaces")}
                  </span>
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
                  <span className="text-sm text-foreground">
                    {t("plans.features.teamMembers")}
                  </span>
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
                    {t("plans.features.queueManagement")}
                  </span>
                  <div
                    className={`text-xs ${plan.features.queueManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {t("plans.features.queueManagementDesc")}
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
                    {t("plans.features.exchangeManagement")}
                  </span>
                  <div
                    className={`text-xs ${plan.features.exchangeManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {t("plans.features.exchangeManagementDesc")}
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
                    {t("plans.features.virtualHostManagement")}
                  </span>
                  <div
                    className={`text-xs ${plan.features.virtualHostManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {t("plans.features.virtualHostManagementDesc")}
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
                    {t("plans.features.rabbitMQUserManagement")}
                  </span>
                  <div
                    className={`text-xs ${plan.features.rabbitMQUserManagement ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {t("plans.features.rabbitMQUserManagementDesc")}
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
                    {t("plans.features.alertsNotification")}
                  </span>
                  <div
                    className={`text-xs ${plan.features.alertsNotification ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {t("plans.features.alertsNotificationDesc")}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.support")}
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <div className="mt-1">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm text-foreground">
                    {t("plans.features.communitySupport")}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {t("plans.features.communitySupportDesc")}
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
                    {t("plans.features.prioritySupport")}
                  </span>
                  <div
                    className={`text-xs ${plan.features.prioritySupport ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {t("plans.features.prioritySupportDesc")}
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
                    {t("plans.features.emailAlerts")}
                  </span>
                  <div
                    className={`text-xs ${plan.features.emailAlerts ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {t("plans.features.emailAlertsDesc")}
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <Button
          onClick={() => onUpgrade(plan.id as UserPlan, billingInterval)}
          className={`w-full ${isCurrentPlan || isUpgrading ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "bg-gradient-button hover:bg-gradient-button-hover text-white"}`}
          disabled={isCurrentPlan || isUpgrading}
        >
          {isCurrentPlan ? t("plans.currentPlan") : t("plans.startFree")}
        </Button>
      </CardContent>
    </Card>
  );
};

interface PlansPageProps {
  onUpgrade: (plan: UserPlan, billingInterval: "monthly" | "yearly") => void;
  isUpgrading?: boolean;
}

export const PlansPage: React.FC<PlansPageProps> = ({
  onUpgrade,
  isUpgrading,
}) => {
  const { t } = useTranslation("billing");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const navigate = useNavigate();
  const { userPlan } = useUser();

  const planPricing = {
    monthly: {
      FREE: { price: t("plans.pricing.free"), originalPrice: undefined },
      DEVELOPER: { price: "$10", originalPrice: undefined },
      ENTERPRISE: { price: "$50", originalPrice: undefined },
    },
    yearly: {
      FREE: { price: t("plans.pricing.free"), originalPrice: undefined },
      DEVELOPER: { price: "$100", originalPrice: "$120" },
      ENTERPRISE: { price: "$500", originalPrice: "$600" },
    },
  };

  const plans = [
    {
      id: "FREE",
      name: t("plans.free.name"),
      description: t("plans.free.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: t("plans.free.features.servers"),
        rabbitMQVersionSupport: t("plans.free.features.rabbitMQVersionSupport"),
        workspaces: t("plans.free.features.workspaces"),
        teamMembers: t("plans.free.features.teamMembers"),
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
      name: t("plans.developer.name"),
      description: t("plans.developer.description"),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      features: {
        servers: t("plans.developer.features.servers"),
        rabbitMQVersionSupport: t(
          "plans.developer.features.rabbitMQVersionSupport"
        ),
        workspaces: t("plans.developer.features.workspaces"),
        teamMembers: t("plans.developer.features.teamMembers"),
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
      name: t("plans.enterprise.name"),
      description: t("plans.enterprise.description"),
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      features: {
        servers: t("plans.enterprise.features.servers"),
        rabbitMQVersionSupport: t(
          "plans.enterprise.features.rabbitMQVersionSupport"
        ),
        workspaces: t("plans.enterprise.features.workspaces"),
        teamMembers: t("plans.enterprise.features.teamMembers"),
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
                  title={t("plans.backToProfile")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="title-page">{t("plans.chooseYourPlan")}</h1>
                  <p className="text-gray-500">{t("plans.subtitle")}</p>
                </div>
              </div>
              <PlanBadge />
            </div>

            {/* Pricing Section - matching landing page */}
            <div className="py-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  {t("plans.pricingTitle")}
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  {t("plans.subtitle")}
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
                      {t("plans.highlights.liveMonitoring")}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      {t("plans.highlights.liveMonitoringDesc")}
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-purple-100 p-3 rounded-full mb-3">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {t("plans.highlights.smartAnalytics")}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      {t("plans.highlights.smartAnalyticsDesc")}
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-green-100 p-3 rounded-full mb-3">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {t("plans.highlights.enterpriseSecurity")}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      {t("plans.highlights.enterpriseSecurityDesc")}
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-orange-100 p-3 rounded-full mb-3">
                      <Headphones className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {t("plans.highlights.support247")}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center">
                      {t("plans.highlights.support247Desc")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4 mb-16">
                <span
                  className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {t("plans.billingToggle.monthly")}
                </span>
                <button
                  onClick={() =>
                    setBillingPeriod(
                      billingPeriod === "monthly" ? "yearly" : "monthly"
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    billingPeriod === "yearly" ? "bg-primary" : "bg-muted"
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
                  {t("plans.billingToggle.yearly")}
                </span>
                {billingPeriod === "yearly" && (
                  <Badge className="bg-green-100 text-green-800">
                    {t("plans.save20")}
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
                        isCurrentPlan={isCurrentPlan}
                        onUpgrade={onUpgrade}
                        billingInterval={billingPeriod}
                        isUpgrading={isUpgrading}
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
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();

  return <PlansPage onUpgrade={handleUpgrade} isUpgrading={isUpgrading} />;
};

export default Plans;
