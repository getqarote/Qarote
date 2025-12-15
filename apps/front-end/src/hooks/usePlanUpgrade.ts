import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/lib/api";
import { logger } from "@/lib/logger";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useUser } from "@/hooks/useUser";

import { UserPlan } from "@/types/plans";

import { useWorkspace } from "./useWorkspace";

export const usePlanUpgrade = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const handleUpgrade = async (
    targetPlan: UserPlan,
    billingInterval: "monthly" | "yearly" = "monthly"
  ) => {
    if (!workspace || !user) {
      navigate("/auth/signin");
      return;
    }

    setIsUpgrading(true);

    try {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      if (targetPlan === UserPlan.FREE) {
        // Handle free plan - redirect to customer portal for downgrades
        const { url } = await apiClient.createPortalSession(workspace.id);
        window.location.href = url;
        return;
      }

      // Create Stripe checkout session for paid plans
      const { url } = await apiClient.createCheckoutSession(workspace.id, {
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
      if (!workspace.id) {
        throw new Error("Workspace ID is required");
      }
      const { url } = await apiClient.createPortalSession(workspace.id);

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
  const { userPlan } = useUser();

  const currentPlan = userPlan || UserPlan.FREE;

  const getUpgradeMessage = (feature: string) => {
    return `To use ${feature}, upgrade your plan from ${currentPlan}`;
  };

  const shouldShowUpgradePrompt = (requiredPlan: UserPlan) => {
    const planHierarchy = {
      [UserPlan.FREE]: 0,
      [UserPlan.DEVELOPER]: 1,
      [UserPlan.ENTERPRISE]: 2,
    };

    return planHierarchy[currentPlan] < planHierarchy[requiredPlan];
  };

  return {
    currentPlan,
    getUpgradeMessage,
    shouldShowUpgradePrompt,
  };
};
