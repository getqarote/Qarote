import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Check, Zap, Loader2 } from "lucide-react";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import logger from "@/lib/logger";
import { apiClient } from "@/lib/api";

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: WorkspacePlan;
  feature: string;
}

const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  feature,
}) => {
  const { planData } = useWorkspace();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch all plans data
  const { data: allPlansData } = useQuery({
    queryKey: ["plans", "all"],
    queryFn: () => apiClient.getAllPlans(),
  });

  const handleUpgrade = async (targetPlan: WorkspacePlan) => {
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

  const plans = allPlansData.plans.filter((p) => p.plan !== WorkspacePlan.FREE);

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
              {planData.planFeatures.displayName || currentPlan} plan
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

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((planData) => {
              const isPopular = planData.plan === WorkspacePlan.STARTUP;
              const price = `$${Math.floor(planData.monthlyPrice / 100)}`;

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
                      {planData.displayName}
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
                        {planData.maxQueues || "Unlimited"} queues
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {planData.maxServers
                          ? `${planData.maxServers} servers`
                          : "Unlimited servers"}
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {planData.maxUsers || "Unlimited"} team members
                      </span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        {planData.maxMessagesPerMonth
                          ? `${planData.maxMessagesPerMonth.toLocaleString()} messages/month`
                          : "Unlimited messages"}
                      </span>
                    </li>
                    {planData.hasAdvancedMetrics && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">
                          Advanced metrics
                        </span>
                      </li>
                    )}
                    {planData.hasAdvancedAlerts && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">
                          Advanced alerts
                        </span>
                      </li>
                    )}
                    {planData.hasPrioritySupport && (
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">
                          Priority support
                        </span>
                      </li>
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
                        Upgrade to {planData.displayName}
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

export default PlanUpgradeModal;
