import { useState } from "react";
import { useNavigate } from "react-router";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { UserPlan } from "@/types/plans";

import { useWorkspace } from "./useWorkspace";

type BillingInterval = "monthly" | "yearly";

export const usePlanUpgrade = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const checkoutMutation =
    trpc.payment.checkout.createCheckoutSession.useMutation({
      onSuccess: (data) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          logger.error("Checkout session returned no URL");
          setIsUpgrading(false);
        }
      },
      onError: (error) => {
        logger.error("Error creating checkout session:", error);
        alert(
          "There was an error creating the checkout session. Please try again."
        );
        setIsUpgrading(false);
      },
    });

  const createPortalMutation =
    trpc.payment.billing.createPortalSession.useMutation({
      onSuccess: (data) => {
        logger.info("Redirecting to customer portal:", data.url);
        window.location.href = data.url;
      },
      onError: (error) => {
        logger.error("Error opening customer portal:", error);
        alert(
          "There was an error opening the customer portal. Please try again."
        );
        setIsUpgrading(false);
      },
    });

  const handleUpgrade = async (
    targetPlan: UserPlan,
    billingInterval: BillingInterval = "monthly"
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
        createPortalMutation.mutate();
        return;
      }

      checkoutMutation.mutate({
        plan: targetPlan,
        billingInterval,
      });
    } catch (error) {
      logger.error("Error upgrading plan:", error);
      alert("There was an error upgrading your plan. Please try again.");
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
      createPortalMutation.mutate();
    } catch (error) {
      logger.error("Error opening customer portal:", error);
      alert(
        "There was an error opening the customer portal. Please try again."
      );
      setIsUpgrading(false);
    }
  };

  return {
    handleUpgrade,
    openCustomerPortal,
    isUpgrading,
  };
};
