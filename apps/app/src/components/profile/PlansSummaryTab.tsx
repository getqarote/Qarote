import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import {
  ArrowRight,
  Crown,
  ExternalLink,
  Key,
  Loader2,
  Server,
  Users,
  Zap,
} from "lucide-react";

import { UserRole } from "@/lib/api";
import { isSelfHostedMode } from "@/lib/featureFlags";
import { formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAllPlans } from "@/hooks/queries/usePlans";
import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { getPlanDisplayName, UserPlan } from "@/types/plans";

interface PlansSummaryTabProps {
  currentPlan: UserPlan;
  className?: string;
}

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

  // Helper function to get next plan
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

  // UI styling per plan (icons/colors are purely presentational)
  const planStyle: Record<
    string,
    { icon: React.ReactNode; color: string; bgColor: string }
  > = {
    [UserPlan.FREE]: {
      icon: <Users className="w-5 h-5" />,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    [UserPlan.DEVELOPER]: {
      icon: <Zap className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    [UserPlan.ENTERPRISE]: {
      icon: <Crown className="w-5 h-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
  };

  // Get featureDescriptions from the API, falling back to current plan data
  const getBenefits = (plan: UserPlan): string[] => {
    if (allPlansData?.plans) {
      const found = allPlansData.plans.find((p) => p.plan === plan);
      if (found?.featureDescriptions) return found.featureDescriptions;
    }
    // Fallback to current plan's features when allPlans is loading/errored
    if (plan === currentPlan && planData?.planFeatures?.featureDescriptions) {
      return planData.planFeatures.featureDescriptions;
    }
    return [];
  };

  const navigate = useNavigate();
  const selfHosted = isSelfHostedMode();
  const isAdmin = user.role === UserRole.ADMIN;
  const currentPlanStyle = planStyle[currentPlan] ?? planStyle[UserPlan.FREE];
  const currentBenefits = getBenefits(currentPlan);
  const nextPlan = getNextPlan(currentPlan);
  const nextPlanStyle = nextPlan ? planStyle[nextPlan] : null;
  const nextPlanBenefits = nextPlan ? getBenefits(nextPlan) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Plan Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentPlanStyle.bgColor}`}>
                <div className={currentPlanStyle.color}>
                  {currentPlanStyle.icon}
                </div>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t("currentPlan.planName", {
                    plan: getPlanDisplayName(currentPlan),
                  })}
                  <Badge variant="outline" className="text-xs">
                    {t("status.active", "Active")}
                  </Badge>
                  {isTrialing && (
                    <Badge
                      variant="outline"
                      className="text-xs border-purple-300 text-purple-600"
                    >
                      {t("trial.badge")}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {isTrialing && trialEndDate
                    ? `${t("trial.endsOn")}: ${formatDate(trialEndDate)}`
                    : t("currentPlan.activeSubscription")}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">
                {t("plansSummary.whatsIncluded")}
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentBenefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-50 dark:bg-blue-900/200 rounded-full"></div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Suggestion */}
      {selfHosted && currentPlan === UserPlan.FREE ? (
        <Card className="border border-purple-200 bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <Key className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t("plansSummary.unlockPremium")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("plansSummary.unlockPremiumDesc")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <Button
                  onClick={() => navigate("/settings/license")}
                  className="btn-primary"
                >
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
          </CardContent>
        </Card>
      ) : !selfHosted && nextPlan && nextPlanStyle ? (
        <Card className="border border-purple-200 bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${nextPlanStyle.bgColor}`}>
                    <div className={nextPlanStyle.color}>
                      {nextPlanStyle.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t("plansSummary.readyToGrow", {
                        plan: getPlanDisplayName(nextPlan),
                      })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("plansSummary.unlockMore")}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-foreground mb-2">
                    {t("plansSummary.youllGet")}
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {nextPlanBenefits.map((benefit, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <div className="w-1.5 h-1.5 bg-purple-50 dark:bg-purple-900/200 rounded-full"></div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="ml-4">
                <Button
                  onClick={() => handleUpgrade(nextPlan)}
                  className="btn-primary"
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("plansSummary.processing")}
                    </>
                  ) : (
                    t("plansSummary.upgradeNow")
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick Actions - Only show for admins */}
      {isAdmin && (
        <div
          className={`grid grid-cols-1 ${selfHosted ? "" : "md:grid-cols-2"} gap-4`}
        >
          {selfHosted ? (
            <Link to="/settings/license">
              <Card className="cursor-pointer hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{t("plansSummary.license")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("plansSummary.manageLicense")}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ) : (
            <>
              <Link to="/billing">
                <Card className="cursor-pointer hover:border-primary/30 transition-colors h-full">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">
                        {t("plansSummary.billingUsage")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("plansSummary.manageSubscription")}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/plans">
                <Card className="cursor-pointer hover:border-primary/30 transition-colors h-full">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">
                        {t("plansSummary.comparePlans")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("plansSummary.seeAllOptions")}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
        </div>
      )}

      {/* Self-host callout - Only show in cloud mode */}
      {!selfHosted && (
        <a
          href={`${import.meta.env.VITE_PORTAL_URL}/documentation`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Card className="cursor-pointer hover:border-primary/30 transition-colors">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">
                    {t("plansSummary.preferSelfHost")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("plansSummary.preferSelfHostDesc")}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </a>
      )}
    </div>
  );
};
