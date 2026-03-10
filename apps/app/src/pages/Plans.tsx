import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";

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
  t: (key: string, opts?: Record<string, unknown>) => string
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
  soonLabel?: string;
}> = ({ label, detail, soonLabel }) => (
  <li className="flex items-start gap-3">
    <div className="mt-1.5 w-3.5 shrink-0 flex items-start">
      <Check className="text-green-500 w-[0.7rem] h-[0.7rem]" />
    </div>
    <div className="flex-1">
      <span className="text-sm text-foreground flex items-center gap-2">
        {label}
        {soonLabel && (
          <span className="font-medium px-1 border border-border text-muted-foreground text-[0.65rem]">
            {soonLabel}
          </span>
        )}
      </span>
      {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
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
  altPriceLabel?: string;
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
  altPriceLabel,
  isCurrentPlan,
  onUpgrade,
  billingInterval,
  isUpgrading,
  t,
}) => {
  const soonLabel = t("plans.features.soon");

  const versionDetail = plan.ltsOnly
    ? t("plans.features.ltsVersions")
    : t("plans.features.allVersions");

  return (
    <Card className="relative flex h-full flex-col bg-transparent">
      <CardContent className="p-6 flex flex-col h-full">
        {isCurrentPlan && (
          <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-[#FF691B] text-[#FF691B]">
            {t("plans.currentPlan")}
          </span>
        )}
        {!isCurrentPlan && plan.isPopular && (
          <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-[#FF691B] text-[#FF691B]">
            {t("plans.mostPopular")}
          </span>
        )}

        <div className="text-left">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-2xl font-normal text-foreground">
              {plan.displayName}
            </h3>
          </div>

          <div className="mb-2 flex flex-col justify-start min-h-[90px]">
            <div className="flex items-center justify-start gap-4">
              <span className="text-5xl font-medium text-foreground">
                {price}
              </span>
              {plan.monthlyPrice > 0 && (
                <div className="flex flex-col leading-tight">
                  <span className="text-sm text-muted-foreground">
                    /{periodLabel}
                  </span>
                  {billingInterval === "yearly" && (
                    <span className="text-sm text-muted-foreground">
                      {t("plans.billingToggle.billedYearly")}
                    </span>
                  )}
                </div>
              )}
            </div>
            {originalPrice && altPriceLabel && (
              <span className="text-sm text-muted-foreground mt-4">
                <span className="font-medium text-foreground">
                  {originalPrice}
                </span>{" "}
                {altPriceLabel}
              </span>
            )}
          </div>
        </div>

        <hr className="border-border mt-4 mb-8" />

        <div className="space-y-6 flex-1">
          {/* Core Features */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
              {t("plans.features.coreFeatures")}
            </h4>
            <ul className="space-y-2">
              <FeatureItem
                label={t("plans.features.rabbitMQServers")}
                detail={formatLimit(plan.maxServers, t)}
              />
              <FeatureItem
                label={t("plans.features.workspaces")}
                detail={formatLimit(plan.maxWorkspaces, t)}
              />
              <FeatureItem
                label={t("plans.features.teamMembers")}
                detail={formatLimit(plan.maxUsers, t)}
              />
              {plan.hasAdvancedAnalytics && (
                <FeatureItem label={t("plans.features.advancedAnalytics")} />
              )}
              <FeatureItem label={t("plans.features.queueManagement")} />
              {plan.hasAlerts && (
                <FeatureItem label={t("plans.features.alertsWebhooks")} />
              )}
              {plan.hasTopologyVisualization && (
                <FeatureItem
                  label={t("plans.features.topologyVisualization")}
                  soonLabel={
                    plan.hasTopologyVisualization === "coming_soon"
                      ? soonLabel
                      : undefined
                  }
                />
              )}
              {plan.hasRoleBasedAccess && (
                <FeatureItem
                  label={t("plans.features.roleBasedAccess")}
                  soonLabel={
                    plan.hasRoleBasedAccess === "coming_soon"
                      ? soonLabel
                      : undefined
                  }
                />
              )}
            </ul>
          </div>

          {/* Security & Compatibility */}
          <div className="mt-auto space-y-4">
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.securityCompatibility")}
            </h4>
            <ul className="space-y-2">
              {plan.hasSsoSamlOidc && (
                <FeatureItem label={t("plans.features.ssoSamlOidc")} />
              )}
              {plan.hasSoc2Compliance && (
                <FeatureItem label={t("plans.features.soc2Compliance")} />
              )}
              <FeatureItem
                label={t("plans.features.rabbitMQVersionSupport")}
                detail={versionDetail}
              />
            </ul>
          </div>

          {/* Support */}
          <div className="mt-auto space-y-4">
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.support")}
            </h4>
            <ul className="space-y-2">
              {plan.hasCommunitySupport && (
                <FeatureItem label={t("plans.features.communitySupport")} />
              )}
              {plan.hasPrioritySupport && (
                <FeatureItem label={t("plans.features.prioritySupport")} />
              )}
            </ul>
          </div>
        </div>

        <Button
          size={undefined}
          onClick={() => onUpgrade(plan.plan as UserPlan, billingInterval)}
          className={`w-full mt-6 px-4 py-3 sm:px-7 sm:py-3 transition-colors duration-200 text-base sm:text-lg h-auto rounded-full ${
            isCurrentPlan
              ? "bg-transparent border border-border text-muted-foreground cursor-not-allowed"
              : "bg-gradient-button hover:bg-gradient-button-hover text-white"
          }`}
          disabled={isCurrentPlan || isUpgrading}
        >
          {isCurrentPlan
            ? t("plans.currentPlan")
            : plan.monthlyPrice === 0
              ? t("plans.getStarted")
              : t("plans.startFree")}
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
  const {
    data: allPlansData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAllPlans();

  const plans: ApiPlan[] = allPlansData?.plans ?? [];

  /** Get price string, localized period label, and optional alt price for a plan */
  function getPricing(plan: ApiPlan): {
    price: string;
    periodLabel: string;
    originalPrice?: string;
    altPriceLabel?: string;
  } {
    const periodLabel = t("plans.period.month");

    if (plan.monthlyPrice === 0) {
      return { price: formatPrice(0), periodLabel };
    }
    if (billingPeriod === "yearly") {
      const monthlyEquivalent = yearlyToMonthly(plan.yearlyPrice);
      return {
        price: formatPrice(monthlyEquivalent),
        periodLabel,
        originalPrice: formatPrice(plan.monthlyPrice),
        altPriceLabel: t("plans.billingToggle.billedMonthly"),
      };
    }
    const yearlyMonthly = yearlyToMonthly(plan.yearlyPrice);
    return {
      price: formatPrice(plan.monthlyPrice),
      periodLabel,
      originalPrice: formatPrice(yearlyMonthly),
      altPriceLabel: t("plans.billingToggle.billedYearly"),
    };
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
            <div className="pt-4 pb-12">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
                  {t("plans.pricingTitle")}
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  {t("plans.subtitle")}
                </p>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <span
                  className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {t("plans.billingToggle.monthly")}
                </span>
                <button
                  role="switch"
                  aria-checked={billingPeriod === "yearly"}
                  aria-label={t("plans.billingToggle.label")}
                  onClick={() =>
                    setBillingPeriod(
                      billingPeriod === "monthly" ? "yearly" : "monthly"
                    )
                  }
                  className={`relative inline-flex items-center w-[27px] h-[15px] rounded-full transition-colors ${
                    billingPeriod === "yearly" ? "bg-[#FF691B]" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block w-[9px] h-[9px] rounded-full bg-white transition-transform ${
                      billingPeriod === "yearly"
                        ? "translate-x-[15px]"
                        : "translate-x-[3px]"
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {t("plans.billingToggle.yearly")}
                </span>
                {billingPeriod === "yearly" && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {t("plans.save20")}
                  </Badge>
                )}
              </div>

              {/* Plans Grid */}
              <div className="flex justify-center w-full">
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
                    <Button variant="outline" onClick={() => refetch()}>
                      {t("paymentCancelled.tryAgain")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl">
                    {plans.map((plan) => {
                      const {
                        price,
                        periodLabel,
                        originalPrice,
                        altPriceLabel,
                      } = getPricing(plan);
                      const isCurrentPlan =
                        plan.plan === userPlan?.toUpperCase();

                      return (
                        <PlanCard
                          key={plan.plan}
                          plan={plan}
                          price={price}
                          originalPrice={originalPrice}
                          altPriceLabel={altPriceLabel}
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
