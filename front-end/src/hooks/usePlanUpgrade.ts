import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WorkspacePlan } from "@/lib/plans/planUtils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

export const usePlanUpgrade = () => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  const handleUpgrade = async (targetPlan: WorkspacePlan) => {
    if (!workspace || !user) {
      navigate("/auth/signin");
      return;
    }

    setIsUpgrading(true);

    try {
      // For now, we'll just show a coming soon message
      // In the future, this would integrate with a payment processor

      if (targetPlan === WorkspacePlan.FREE) {
        // Handle free plan signup/downgrade
        console.log("Switching to free plan");
        return;
      }

      // For paid plans, show upgrade modal or redirect to payment
      console.log(`Upgrading to ${targetPlan} plan`);

      // This would typically:
      // 1. Open a payment modal (Stripe, PayPal, etc.)
      // 2. Handle payment processing
      // 3. Update the workspace plan on success
      // 4. Show success message

      alert(`Upgrade to ${targetPlan} plan - Payment integration coming soon!`);
    } catch (error) {
      console.error("Error upgrading plan:", error);
      alert("There was an error upgrading your plan. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return {
    handleUpgrade,
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
