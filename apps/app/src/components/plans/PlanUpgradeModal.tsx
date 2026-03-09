import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Check, Key, Loader2, X, Zap } from "lucide-react";

import { isSelfHostedMode } from "@/lib/featureFlags";

import { useAllPlans } from "@/hooks/queries/usePlans";
import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

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
  const { data: allPlansData } = useAllPlans();

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

  if (!allPlansData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            <span>{t("upgradeModal.loadingPlans")}</span>
          </div>
        </div>
      </div>
    );
  }

  const plans = allPlansData.plans.filter((p) => p.plan !== UserPlan.FREE);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t("upgradeModal.upgradeYourPlan")}
            </h2>
            <p className="text-gray-600 mt-1">
              {t("upgradeModal.upgradeDescription", {
                feature,
                plan: planData.planFeatures.displayName || userPlan,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((planData) => {
              const isPopular = planData.plan === UserPlan.DEVELOPER;
              // Use fixed pricing for the new plan structure
              const price =
                planData.plan === UserPlan.DEVELOPER ? "$10" : "$50";

              return (
                <div
                  key={planData.plan}
                  className={`border rounded-lg p-6 relative ${
                    isPopular ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {t("upgradeModal.mostPopular")}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      {planData.displayName ||
                        (planData.plan === UserPlan.DEVELOPER
                          ? t("plans.developer.name")
                          : t("plans.enterprise.name"))}
                    </h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {price}
                      </span>
                      <span className="text-gray-600">
                        {t("upgradeModal.perMonth")}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {t("upgradeModal.unlimitedQueues")}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {t("upgradeModal.unlimitedServers")}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {planData.plan === UserPlan.DEVELOPER
                          ? t("upgradeModal.teamMembers", { count: 5 })
                          : t("upgradeModal.unlimitedTeamMembers")}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {t("upgradeModal.messageSending")}
                      </span>
                    </li>
                    {planData.plan === UserPlan.ENTERPRISE && (
                      <>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {t("upgradeModal.advancedMetrics")}
                          </span>
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {t("upgradeModal.prioritySupport")}
                          </span>
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {t("upgradeModal.advancedAlerts")}
                          </span>
                        </li>
                      </>
                    )}
                  </ul>

                  <button
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                      isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                    }`}
                    onClick={() => handleUpgrade(planData.plan as UserPlan)}
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
                          plan:
                            planData.displayName ||
                            (planData.plan === UserPlan.DEVELOPER
                              ? t("plans.developer.name")
                              : t("plans.enterprise.name")),
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
