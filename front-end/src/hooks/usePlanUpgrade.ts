import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import logger from "@/lib/logger";

export const usePlanUpgrade = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const handleUpgrade = async (
    targetPlan: WorkspacePlan,
    billingInterval: "monthly" | "yearly" = "monthly"
  ) => {
    if (!workspace || !user) {
      navigate("/auth/signin");
      return;
    }

    setIsUpgrading(true);

    try {
      if (targetPlan === WorkspacePlan.FREE) {
        // Handle free plan - redirect to customer portal for downgrades
        const { url } = await apiClient.createPortalSession();
        window.location.href = url;
        return;
      }

      // Create Stripe checkout session for paid plans
      const { url } = await apiClient.createCheckoutSession({
        plan: targetPlan,
        billingInterval,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancelled`,
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      logger.error("Error upgrading plan:", error);
      alert("There was an error upgrading your plan. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!workspace || !user) {
      navigate("/auth/signin");
      return;
    }

    setIsUpgrading(true);

    try {
      const { url } = await apiClient.createPortalSession();

      logger.info("Redirecting to customer portal:", url);

      window.location.href = url;
    } catch (error) {
      logger.error("Error opening customer portal:", error);
      alert(
        "There was an error opening the customer portal. Please try again."
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  return {
    handleUpgrade,
    openCustomerPortal,
    isUpgrading,
  };
};

export const usePlanFeatures = () => {
  const { workspace } = useWorkspace();

  const currentPlan = workspace?.plan || WorkspacePlan.FREE;

  const getUpgradeMessage = (feature: string) => {
    return `To use ${feature}, upgrade your plan from ${currentPlan}`;
  };

  const shouldShowUpgradePrompt = (requiredPlan: WorkspacePlan) => {
    const planHierarchy = {
      [WorkspacePlan.FREE]: 0,
      [WorkspacePlan.DEVELOPER]: 1,
      [WorkspacePlan.STARTUP]: 2,
      [WorkspacePlan.BUSINESS]: 3,
    };

    return planHierarchy[currentPlan] < planHierarchy[requiredPlan];
  };

  return {
    currentPlan,
    getUpgradeMessage,
    shouldShowUpgradePrompt,
  };
};
