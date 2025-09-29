import React from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import logger from "@/lib/logger";
import { BillingOverviewResponse } from "@/lib/api/paymentClient";
import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import { WorkspacePlan } from "@/types/plans";
import {
  BillingHeader,
  BillingLayout,
  SubscriptionManagement,
  RecentPayments,
  CurrentPlanCard,
} from "@/components/billing";

interface ExtendedSubscription {
  cancelAtPeriodEnd?: boolean;
  [key: string]: unknown;
}

interface ExtendedStripeSubscription {
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  [key: string]: unknown;
}

const Billing: React.FC = () => {
  const { workspace } = useWorkspace();
  const { handleUpgrade } = usePlanUpgrade();
  const queryClient = useQueryClient();

  const {
    data: billingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["billing", workspace?.id],
    queryFn: async (): Promise<BillingOverviewResponse> => {
      if (!workspace?.id) throw new Error("No workspace");
      return await apiClient.getBillingOverview();
    },
    enabled: !!workspace?.id,
  });

  const handleCancelSubscription = async (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => {
    try {
      const response = await apiClient.cancelSubscription(data);
      logger.info("Subscription canceled successfully", response);

      // Show success message to user
      if (response.message) {
        // You might want to show a toast notification here
        console.log("Cancellation message:", response.message);
      }

      // Refetch billing data to update the UI
      await queryClient.invalidateQueries({
        queryKey: ["billing", workspace?.id],
      });

      return response;
    } catch (error) {
      logger.error("Failed to cancel subscription:", error);
      throw error; // Re-throw so the modal can handle the error
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      const data = await apiClient.createBillingPortalSession();
      window.open(data.url, "_blank");
    } catch (error) {
      logger.error("Failed to open billing portal:", error);
    }
  };

  const handleRenewSubscription = async () => {
    try {
      // Determine the plan to renew based on subscription history
      const planToRenew =
        billingData?.subscription?.plan || WorkspacePlan.DEVELOPER;
      const data = await apiClient.renewSubscription(planToRenew, "monthly");
      window.location.href = data.url;
    } catch (error) {
      logger.error("Failed to renew subscription:", error);
    }
  };

  // Determine if the subscription was canceled
  const subscriptionCanceled =
    billingData?.workspace.plan === WorkspacePlan.FREE &&
    billingData?.subscription?.status === "CANCELED";

  // Get the last plan they had before canceling
  const lastPlan = subscriptionCanceled
    ? billingData?.subscription?.plan
    : undefined;

  return (
    <BillingLayout isLoading={isLoading} error={!!error || !billingData}>
      {billingData && (
        <>
          <BillingHeader />

          <CurrentPlanCard
            workspace={{ plan: billingData.workspace.plan }}
            subscription={billingData.subscription}
            stripeSubscription={billingData.stripeSubscription}
            paymentMethod={billingData.paymentMethod}
          />

          <SubscriptionManagement
            currentPlan={billingData.workspace.plan}
            onOpenBillingPortal={handleOpenBillingPortal}
            onUpgrade={handleUpgrade}
            onRenewSubscription={handleRenewSubscription}
            onCancelSubscription={handleCancelSubscription}
            periodEnd={
              billingData.stripeSubscription?.current_period_end
                ? new Date(
                    billingData.stripeSubscription.current_period_end * 1000
                  ).toISOString()
                : undefined
            }
            isLoading={isLoading}
            cancelAtPeriodEnd={
              (billingData.stripeSubscription as ExtendedStripeSubscription)
                ?.cancel_at_period_end ||
              (billingData.subscription as ExtendedSubscription)
                ?.cancelAtPeriodEnd ||
              false
            }
            subscriptionCanceled={subscriptionCanceled}
            lastPlan={lastPlan}
          />

          <RecentPayments recentPayments={billingData.recentPayments} />
        </>
      )}
    </BillingLayout>
  );
};

export default Billing;
