import { useState } from "react";
import { useNavigate } from "react-router";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { UserPlan } from "@/types/plans";

import { useWorkspace } from "./useWorkspace";

export const usePlanUpgrade = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const startTrialMutation = trpc.payment.checkout.startTrial.useMutation({
    onSuccess: () => {
      setIsUpgrading(false);
      navigate("/billing");
    },
    onError: (error) => {
      logger.error("Error starting trial:", error);
      alert("There was an error starting your trial. Please try again.");
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

  const handleUpgrade = async (targetPlan: UserPlan) => {
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

      // Start free trial directly (no Stripe Checkout page)
      startTrialMutation.mutate();
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
