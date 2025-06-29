import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkspacePlan } from "@/lib/plans/planUtils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);

export const usePlanUpgrade = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user, token } = useAuth();

  const handleUpgrade = async (
    targetPlan: WorkspacePlan,
    billingInterval: "monthly" | "yearly" = "monthly"
  ) => {
    if (!workspace || !user || !token) {
      navigate("/auth/signin");
      return;
    }

    setIsUpgrading(true);

    try {
      if (targetPlan === WorkspacePlan.FREE) {
        // Handle free plan - redirect to customer portal for downgrades
        const response = await fetch("/api/payments/portal", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const { url } = await response.json();
          window.location.href = url;
        } else {
          throw new Error("Failed to create customer portal session");
        }
        return;
      }

      // Create Stripe checkout session for paid plans
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: targetPlan,
          billingInterval,
          successUrl: `${window.location.origin}/profile?tab=plans&success=true`,
          cancelUrl: `${window.location.origin}/plans`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error upgrading plan:", error);
      alert("There was an error upgrading your plan. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!workspace || !user || !token) {
      navigate("/auth/signin");
      return;
    }

    setIsUpgrading(true);

    try {
      const response = await fetch("/api/payments/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create customer portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error opening customer portal:", error);
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
      [WorkspacePlan.FREELANCE]: 1,
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
