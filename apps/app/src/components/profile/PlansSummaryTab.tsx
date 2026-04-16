import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";

import { UserRole } from "@/lib/api";
import { isSelfHostedMode } from "@/lib/featureFlags";
import { formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PixelCrown } from "@/components/ui/pixel-crown";
import { PixelKey } from "@/components/ui/pixel-key";
import { PixelServer } from "@/components/ui/pixel-server";
import { PixelUser } from "@/components/ui/pixel-user";
import { PixelZap } from "@/components/ui/pixel-zap";

import { useAllPlans } from "@/hooks/queries/usePlans";
import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { getPlanDisplayName, UserPlan } from "@/types/plans";

interface PlansSummaryTabProps {
  currentPlan: UserPlan;
  className?: string;
}

interface PlanStyle {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
}

// Plan presentation (icon + tint). No raw Tailwind palette classes —
// everything goes through the design-system color tokens.
const PLAN_STYLE: Record<string, PlanStyle> = {
  [UserPlan.FREE]: {
    icon: <PixelUser className="h-5 w-auto shrink-0" aria-hidden="true" />,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted",
  },
  [UserPlan.DEVELOPER]: {
    icon: <PixelZap className="h-5 w-auto shrink-0" aria-hidden="true" />,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  [UserPlan.ENTERPRISE]: {
    icon: <PixelCrown className="h-5 w-auto shrink-0" aria-hidden="true" />,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
};

export const PlansSummaryTab: React.FC<PlansSummaryTabProps> = ({
  currentPlan,
  className = "",
}) => {
  const { t } = useTranslation("billing");
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();
  const { planData, user } = useUser();
  const { data: allPlansData } = useAllPlans();

  const isTrialing = planData?.user?.subscriptionStatus === "TRIALING";
  const trialEndDate = planData?.user?.trialEnd
    ? new Date(planData.user.trialEnd)
    : null;

  const getNextPlan = (plan: UserPlan): UserPlan | null => {
    switch (plan) {
      case UserPlan.FREE:
        return UserPlan.DEVELOPER;
      case UserPlan.DEVELOPER:
        return UserPlan.ENTERPRISE;
      default:
        return null;
    }
  };

  const getBenefits = (plan: UserPlan): string[] => {
    if (allPlansData?.plans) {
      const found = allPlansData.plans.find((p) => p.plan === plan);
      if (found?.featureDescriptions) return found.featureDescriptions;
    }
    if (plan === currentPlan && planData?.planFeatures?.featureDescriptions) {
      return planData.planFeatures.featureDescriptions;
    }
    return [];
  };

  const navigate = useNavigate();
  const selfHosted = isSelfHostedMode();
  const isAdmin = user.role === UserRole.ADMIN;
  const currentPlanStyle = PLAN_STYLE[currentPlan] ?? PLAN_STYLE[UserPlan.FREE];
  const currentBenefits = getBenefits(currentPlan);
  const nextPlan = getNextPlan(currentPlan);
  const nextPlanStyle = nextPlan ? PLAN_STYLE[nextPlan] : null;
  const nextPlanBenefits = nextPlan ? getBenefits(nextPlan) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Plan */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3">
            <div
              className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${currentPlanStyle.iconBg}`}
              aria-hidden="true"
            >
              <span className={currentPlanStyle.iconColor}>
                {currentPlanStyle.icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold leading-tight">
                  {t("currentPlan.planName", {
                    plan: getPlanDisplayName(currentPlan),
                  })}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {t("status.active")}
                </Badge>
                {isTrialing && (
                  <Badge
                    variant="outline"
                    className="text-xs border-warning/40 text-warning bg-warning-muted"
                  >
                    {t("trial.badge")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isTrialing && trialEndDate
                  ? `${t("trial.endsOn")}: ${formatDate(trialEndDate)}`
                  : t("currentPlan.activeSubscription")}
              </p>
            </div>
          </div>

          {currentBenefits.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                {t("plansSummary.whatsIncluded")}
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentBenefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0"
                      aria-hidden="true"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Suggestion */}
      {selfHosted && currentPlan === UserPlan.FREE ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
                  aria-hidden="true"
                >
                  <PixelKey className="h-5 w-auto shrink-0 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight">
                    {t("plansSummary.unlockPremium")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("plansSummary.unlockPremiumDesc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <Button onClick={() => navigate("/settings/license")}>
                  {t("plansSummary.activateLicense")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `${import.meta.env.VITE_PORTAL_URL}/purchase`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  {t("plansSummary.purchase")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : !selfHosted && nextPlan && nextPlanStyle ? (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${nextPlanStyle.iconBg}`}
                  aria-hidden="true"
                >
                  <span className={nextPlanStyle.iconColor}>
                    {nextPlanStyle.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight">
                    {t("plansSummary.readyToGrow", {
                      plan: getPlanDisplayName(nextPlan),
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("plansSummary.unlockMore")}
                  </p>
                </div>
              </div>
              <div className="sm:shrink-0">
                <Button
                  onClick={() => handleUpgrade(nextPlan)}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <>
                      <Loader2
                        className="w-4 h-4 mr-2 animate-spin"
                        aria-hidden="true"
                      />
                      {t("plansSummary.processing")}
                    </>
                  ) : (
                    t("plansSummary.upgradeNow")
                  )}
                </Button>
              </div>
            </div>

            {nextPlanBenefits.length > 0 && (
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  {t("plansSummary.youllGet")}
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {nextPlanBenefits.map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0"
                        aria-hidden="true"
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Quick Actions - Only show for admins */}
      {isAdmin && (
        <div className="rounded-lg border border-border overflow-hidden">
          <ul className="divide-y divide-border">
            {selfHosted ? (
              <li>
                <Link
                  to="/settings/license"
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {t("plansSummary.license")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("plansSummary.manageLicense")}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground shrink-0"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link
                    to="/settings/subscription/billing"
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {t("plansSummary.billingUsage")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("plansSummary.manageSubscription")}
                      </p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/plans"
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {t("plansSummary.comparePlans")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("plansSummary.seeAllOptions")}
                      </p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Self-host callout - Only show in cloud mode */}
      {!selfHosted && (
        <div className="rounded-lg border border-border overflow-hidden">
          <a
            href={`${import.meta.env.VITE_PORTAL_URL}/documentation`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/50 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
                aria-hidden="true"
              >
                <PixelServer className="h-5 w-auto shrink-0 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  {t("plansSummary.preferSelfHost")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("plansSummary.preferSelfHostDesc")}
                </p>
              </div>
            </div>
            <ExternalLink
              className="h-4 w-4 text-muted-foreground shrink-0"
              aria-hidden="true"
            />
          </a>
        </div>
      )}
    </div>
  );
};
