import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AlertCircle, Check, Key, Loader2, X, Zap } from "lucide-react";

import { isSelfHostedMode } from "@/lib/featureFlags";

import { useAllPlans } from "@/hooks/queries/usePlans";
import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

const PLAN_TIER_RANK: Record<string, number> = {
  [UserPlan.FREE]: 0,
  [UserPlan.DEVELOPER]: 1,
  [UserPlan.ENTERPRISE]: 2,
};

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  feature,
}) => {
  const { t } = useTranslation("billing");
  const { planData, userPlan } = useUser();
  const navigate = useNavigate();
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();

  // Fetch all plans data
  const { data: allPlansData, isLoading, error, refetch } = useAllPlans();

  if (!isOpen) return null;

  // Self-hosted: show license activation prompt instead of Stripe plans
  if (isSelfHostedMode()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">
                {t("upgradeModal.licenseRequired")}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-muted-foreground">
              {t("upgradeModal.licenseDescription", { feature })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 btn-primary rounded-lg"
                onClick={() => {
                  onClose();
                  navigate("/settings/license");
                }}
              >
                {t("upgradeModal.activateLicense")}
              </button>
              <button
                type="button"
                className="py-2 px-4 rounded-lg font-medium border border-border hover:bg-muted"
                onClick={() =>
                  window.open(
                    `${import.meta.env.VITE_PORTAL_URL}/purchase`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                {t("upgradeModal.purchase")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg p-6">
          <div className="flex items-center">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            <span>{t("upgradeModal.loadingPlans")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !allPlansData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-foreground">
                {t("upgradeModal.upgradeFailed")}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {error && (
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
          )}
          <button
            type="button"
            className="w-full py-2 px-4 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => refetch()}
          >
            {t("paymentCancelled.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  const currentPlanRank = PLAN_TIER_RANK[userPlan ?? UserPlan.FREE] ?? 0;
  const plans = allPlansData.plans.filter(
    (p) => (PLAN_TIER_RANK[p.plan] ?? 0) > currentPlanRank
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {t("upgradeModal.upgradeYourPlan")}
            </h2>
            <p className="text-muted-foreground mt-1">
              {t("upgradeModal.upgradeDescription", {
                feature,
                plan: planData.planFeatures.displayName || userPlan,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan) => {
              const price = `$${Math.round(plan.monthlyPrice / 100)}`;
              const teamMembersText =
                plan.maxUsers === null
                  ? t("upgradeModal.unlimitedTeamMembers")
                  : t("upgradeModal.teamMembers", { count: plan.maxUsers });
              const serversText =
                plan.maxServers === null
                  ? t("upgradeModal.unlimitedServers")
                  : t("upgradeModal.servers", { count: plan.maxServers });

              return (
                <div
                  key={plan.plan}
                  className={`border rounded-lg p-6 relative ${
                    plan.isPopular
                      ? "border-info bg-info-muted"
                      : "border-border"
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-info-muted0 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {t("upgradeModal.mostPopular")}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-foreground">
                      {plan.displayName}
                    </h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-foreground">
                        {price}
                      </span>
                      <span className="text-muted-foreground">
                        {t("upgradeModal.perMonth")}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-success mr-2" />
                      <span className="text-sm text-muted-foreground">
                        {t("upgradeModal.unlimitedQueues")}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-success mr-2" />
                      <span className="text-sm text-muted-foreground">
                        {serversText}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-success mr-2" />
                      <span className="text-sm text-muted-foreground">
                        {teamMembersText}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-success mr-2" />
                      <span className="text-sm text-muted-foreground">
                        {t("upgradeModal.messageSending")}
                      </span>
                    </li>
                    {plan.hasPrioritySupport && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-success mr-2" />
                        <span className="text-sm text-muted-foreground">
                          {t("upgradeModal.prioritySupport")}
                        </span>
                      </li>
                    )}
                    {plan.hasAdvancedAnalytics && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-success mr-2" />
                        <span className="text-sm text-muted-foreground">
                          {t("upgradeModal.advancedMetrics")}
                        </span>
                      </li>
                    )}
                    {plan.hasAlerts && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-success mr-2" />
                        <span className="text-sm text-muted-foreground">
                          {t("upgradeModal.advancedAlerts")}
                        </span>
                      </li>
                    )}
                  </ul>

                  <button
                    type="button"
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                      plan.isPopular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        : "bg-muted hover:bg-border text-foreground disabled:bg-muted disabled:text-muted-foreground"
                    }`}
                    onClick={() => handleUpgrade(plan.plan as UserPlan)}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                        {t("upgradeModal.processing")}
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 inline-block mr-2" />
                        {t("upgradeModal.upgradeTo", {
                          plan: plan.displayName,
                        })}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
