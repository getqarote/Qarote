import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Check, Loader2, X, Zap } from "lucide-react";

import { apiClient } from "@/lib/api";
import { logger } from "@/lib/logger";

import { useUser } from "@/hooks/useUser";
import { useWorkspace } from "@/hooks/useWorkspace";

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
  const { planData, userPlan } = useUser();
  const { workspace } = useWorkspace();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all plans data
  const { data: allPlansData } = useQuery({
    queryKey: ["plans", "all", workspace?.id],
    queryFn: () => apiClient.getAllPlans(),
    enabled: !!workspace?.id,
  });

  const handleUpgrade = async (targetPlan: UserPlan) => {
    try {
      setError(null);
      setIsUpgrading(targetPlan);

      logger.info(`Starting upgrade to ${targetPlan}`);

      // Create Stripe checkout session
      const response = await apiClient.createCheckoutSession({
        plan: targetPlan,
        billingInterval: "monthly", // Default to monthly, could be made configurable
      });

      // Redirect to Stripe checkout
      window.location.href = response.url;
    } catch (error) {
      logger.error("Failed to create checkout session:", error);
      setError("Failed to start upgrade process. Please try again.");
      setIsUpgrading(null);
    }
  };

  if (!isOpen) return null;

  if (!allPlansData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            <span>Loading plans...</span>
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
              Upgrade Your Plan
            </h2>
            <p className="text-gray-600 mt-1">
              To use {feature}, you need to upgrade from the{" "}
              {planData.planFeatures.displayName || userPlan} plan. This upgrade
              will apply to all your workspaces.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

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
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      {planData.displayName ||
                        (planData.plan === UserPlan.DEVELOPER
                          ? "Developer"
                          : "Enterprise")}
                    </h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {price}
                      </span>
                      <span className="text-gray-600">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {planData.plan === UserPlan.DEVELOPER
                          ? "Unlimited"
                          : "Unlimited"}{" "}
                        queues
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {planData.plan === UserPlan.DEVELOPER
                          ? "Unlimited"
                          : "Unlimited"}{" "}
                        servers
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {planData.plan === UserPlan.DEVELOPER
                          ? "5"
                          : "Unlimited"}{" "}
                        team members
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        Message sending & queue management
                      </span>
                    </li>
                    {planData.plan === UserPlan.ENTERPRISE && (
                      <>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            Advanced metrics & analytics
                          </span>
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            Priority support
                          </span>
                        </li>
                        <li className="flex items-center">
                          <Check className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            Advanced alerts & notifications
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
                    onClick={() => handleUpgrade(planData.plan)}
                    disabled={isUpgrading !== null}
                  >
                    {isUpgrading === planData.plan ? (
                      <>
                        <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 inline-block mr-2" />
                        Upgrade to{" "}
                        {planData.displayName ||
                          (planData.plan === UserPlan.DEVELOPER
                            ? "Developer"
                            : "Enterprise")}
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
