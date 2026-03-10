import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Headphones,
  Loader2,
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

import { useAllPlans } from "@/hooks/queries/usePlans";
import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

// --- Helpers ---

/** Format a limit number (null = unlimited) into a display string */
function formatLimit(
  value: number | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (value === null || value === undefined) return t("plans.limits.unlimited");
  return t("plans.limits.upTo", { count: value });
}

/** Format cents into a dollar display string like "$34" */
function formatPrice(cents: number): string {
  if (cents === 0) return "$0";
  return `$${Math.round(cents / 100)}`;
}

/** Compute monthly price from yearly total */
function yearlyToMonthly(yearlyCents: number): number {
  return Math.round(yearlyCents / 12);
}

// --- Sub-components ---

const FeatureItem: React.FC<{
  label: string;
  detail?: string;
  enabled?: boolean;
  soonLabel?: string;
}> = ({ label, detail, enabled = true, soonLabel }) => (
  <li className="flex items-start gap-3">
    <div className="mt-1">
      {enabled ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
    <div className="flex-1">
      <span className={`text-sm ${enabled ? "text-foreground" : "text-muted-foreground"} flex items-center gap-2`}>
        {label}
        {soonLabel && (
          <Badge variant="outline" className="text-[0.65rem] px-1 py-0">
            {soonLabel}
          </Badge>
        )}
      </span>
      {detail && (
        <div className="text-xs text-muted-foreground">{detail}</div>
      )}
    </div>
  </li>
);

interface ApiPlan {
  plan: string;
  displayName: string;
  description: string;
  maxServers: number | null;
  maxWorkspaces: number | null;
  maxUsers: number | null;
  monthlyPrice: number;
  yearlyPrice: number;
  hasCommunitySupport: boolean;
  hasPrioritySupport: boolean;
  hasAdvancedAnalytics: boolean;
  hasAlerts: boolean;
  hasTopologyVisualization: boolean | "coming_soon";
  hasRoleBasedAccess: boolean | "coming_soon";
  hasSsoSamlOidc: boolean;
  hasSoc2Compliance: boolean;
  isPopular: boolean;
  ltsOnly: boolean;
}

const PlanCard: React.FC<{
  plan: ApiPlan;
  price: string;
  periodLabel: string;
  originalPrice?: string;
  isCurrentPlan: boolean;
  onUpgrade: (plan: UserPlan, billingInterval: "monthly" | "yearly") => void;
  billingInterval: "monthly" | "yearly";
  isUpgrading?: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}> = ({
  plan,
  price,
  periodLabel,
  originalPrice,
  isCurrentPlan,
  onUpgrade,
  billingInterval,
  isUpgrading,
  t,
}) => {
  const ringClass = isCurrentPlan
    ? "ring-2 ring-blue-500 shadow-lg scale-105"
    : "";

  const soonLabel = t("plans.features.soon");

  const versionDetail = plan.ltsOnly
    ? t("plans.features.ltsVersions")
    : t("plans.features.allVersions");

  return (
    <Card
      className={`relative border-gray-200 ${ringClass} transition-all duration-200 hover:shadow-lg`}
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
          <h3 className="text-2xl font-bold text-gray-600 mb-2">
            {plan.displayName}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {plan.description}
          </p>

          <div className="mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-foreground">
                {price}
              </span>
              {plan.monthlyPrice > 0 && (
                <span className="text-muted-foreground">/{periodLabel}</span>
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
          {/* Core Features */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.coreFeatures")}
            </h4>
            <ul className="space-y-2">
              <FeatureItem
                label={t("plans.features.rabbitMQServers")}
                detail={formatLimit(plan.maxServers, t)}
                enabled
              />
              <FeatureItem
                label={t("plans.features.workspaces")}
                detail={formatLimit(plan.maxWorkspaces, t)}
                enabled
              />
              <FeatureItem
                label={t("plans.features.teamMembers")}
                detail={formatLimit(plan.maxUsers, t)}
                enabled
              />
              <FeatureItem
                label={t("plans.features.advancedAnalytics")}
                enabled={plan.hasAdvancedAnalytics}
              />
              <FeatureItem
                label={t("plans.features.queueManagement")}
                enabled
              />
              <FeatureItem
                label={t("plans.features.alertsWebhooks")}
                enabled={plan.hasAlerts}
              />
              {plan.hasTopologyVisualization && (
                <FeatureItem
                  label={t("plans.features.topologyVisualization")}
                  enabled
                  soonLabel={plan.hasTopologyVisualization === "coming_soon" ? soonLabel : undefined}
                />
              )}
              {plan.hasRoleBasedAccess && (
                <FeatureItem
                  label={t("plans.features.roleBasedAccess")}
                  enabled
                  soonLabel={plan.hasRoleBasedAccess === "coming_soon" ? soonLabel : undefined}
                />
              )}
            </ul>
          </div>

          {/* Security & Compatibility */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.securityCompatibility")}
            </h4>
            <ul className="space-y-2">
              {plan.hasSsoSamlOidc && (
                <FeatureItem label={t("plans.features.ssoSamlOidc")} enabled />
              )}
              <FeatureItem
                label={t("plans.features.soc2Compliance")}
                enabled={plan.hasSoc2Compliance}
              />
              <FeatureItem
                label={t("plans.features.rabbitMQVersionSupport")}
                detail={versionDetail}
                enabled
              />
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.support")}
            </h4>
            <ul className="space-y-2">
              <FeatureItem
                label={t("plans.features.communitySupport")}
                enabled={plan.hasCommunitySupport}
              />
              <FeatureItem
                label={t("plans.features.prioritySupport")}
                enabled={plan.hasPrioritySupport}
              />
            </ul>
          </div>
        </div>

        <Button
          onClick={() => onUpgrade(plan.plan as UserPlan, billingInterval)}
          className={`w-full ${isCurrentPlan || isUpgrading ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "bg-gradient-button hover:bg-gradient-button-hover text-white"}`}
          disabled={isCurrentPlan || isUpgrading}
        >
          {isCurrentPlan ? t("plans.currentPlan") : t("plans.startFree")}
        </Button>
      </CardContent>
    </Card>
  );
};

// --- Main page ---

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
  const { data: allPlansData, isLoading, isError, error, refetch } = useAllPlans();

  const plans: ApiPlan[] = allPlansData?.plans ?? [];

  /** Get price string, localized period label, and optional original price for a plan */
  function getPricing(plan: ApiPlan): { price: string; periodLabel: string; originalPrice?: string } {
    const periodLabel = billingPeriod === "monthly"
      ? t("plans.period.month")
      : t("plans.period.month"); // yearly still shows per-month equivalent

    if (plan.monthlyPrice === 0) {
      return { price: t("plans.pricing.free"), periodLabel };
    }
    if (billingPeriod === "yearly") {
      const monthlyEquivalent = yearlyToMonthly(plan.yearlyPrice);
      return {
        price: formatPrice(monthlyEquivalent),
        periodLabel,
        originalPrice: formatPrice(plan.monthlyPrice),
      };
    }
    return { price: formatPrice(plan.monthlyPrice), periodLabel };
  }

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
                  type="button"
                  onClick={() => navigate("/settings/plans")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t("plans.backToPlans")}
                  aria-label={t("plans.backToPlans")}
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

            {/* Pricing Section */}
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
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-16">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("upgradeModal.loadingPlans")}
                  </div>
                ) : isError || !allPlansData ? (
                  <div
                    className="flex flex-col items-center gap-4 py-16"
                    role="alert"
                    aria-live="polite"
                  >
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <p className="text-muted-foreground">
                      {error?.message ?? t("upgradeModal.upgradeFailed")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => refetch()}
                    >
                      {t("paymentCancelled.tryAgain")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-3 gap-8 max-w-5xl">
                    {plans.map((plan) => {
                      const { price, periodLabel, originalPrice } = getPricing(plan);
                      const isCurrentPlan =
                        plan.plan === userPlan?.toUpperCase();

                      return (
                        <PlanCard
                          key={plan.plan}
                          plan={plan}
                          price={price}
                          originalPrice={originalPrice}
                          periodLabel={periodLabel}
                          isCurrentPlan={isCurrentPlan}
                          onUpgrade={onUpgrade}
                          billingInterval={billingPeriod}
                          isUpgrading={isUpgrading}
                          t={t}
                        />
                      );
                    })}
                  </div>
                )}
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
