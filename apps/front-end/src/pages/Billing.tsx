import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import { BillingOverviewResponse } from "@/lib/api/paymentClient";
import { logger } from "@/lib/logger";

import {
  BillingHeader,
  BillingLayout,
  CurrentPlanCard,
  RecentPayments,
  SubscriptionManagement,
} from "@/components/billing";

import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import { useUser } from "@/hooks/useUser";
import { useWorkspace } from "@/hooks/useWorkspace";

import { UserPlan } from "@/types/plans";

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
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const { handleUpgrade } = usePlanUpgrade();
  const queryClient = useQueryClient();

  const {
    data: billingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["billing", user.id, workspace?.id],
    queryFn: async (): Promise<BillingOverviewResponse> => {
      if (!user.id) throw new Error("No user");
      if (!workspace?.id) throw new Error("No workspace");
      return await apiClient.getBillingOverview(workspace.id);
    },
    enabled: !!user.id && !!workspace?.id,
    enabled: !!user.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - billing data doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: (failureCount, error: unknown) => {
      // Don't retry on 429 (rate limit) errors
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 429
      ) {
        return false;
      }
      // Retry up to 1 time for other errors
      return failureCount < 1;
    },
  });

  const handleCancelSubscription = async (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => {
    try {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      const response = await apiClient.cancelSubscription(workspace.id, data);
      logger.info("Subscription canceled successfully", response);

      // Show success message to user
      if (response.message) {
        // You might want to show a toast notification here
        logger.info("Cancellation message:", response.message);
      }

      // Refetch billing data to update the UI
      await queryClient.invalidateQueries({
        queryKey: ["billing", user.id],
      });

      return response;
    } catch (error) {
      logger.error("Failed to cancel subscription:", error);
      throw error; // Re-throw so the modal can handle the error
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      const data = await apiClient.createBillingPortalSession(workspace.id);
      window.open(data.url, "_blank");
    } catch (error) {
      logger.error("Failed to open billing portal:", error);
    }
  };

  const handleRenewSubscription = async () => {
    try {
      if (!workspace?.id) {
        throw new Error("Workspace ID is required");
      }
      // Determine the plan to renew based on subscription history
      const planToRenew = billingData?.subscription?.plan || UserPlan.DEVELOPER;
      const data = await apiClient.renewSubscription(
        workspace.id,
        planToRenew,
        "monthly"
      );
      window.location.href = data.url;
    } catch (error) {
      logger.error("Failed to renew subscription:", error);
    }
  };

  // Determine if the subscription was canceled
  // A subscription is considered canceled if:
  // 1. Current plan is FREE
  // 2. Status is CANCELED
  // 3. There was a previous paid plan (we check payment history)
  const subscriptionCanceled =
    billingData?.subscription?.plan === UserPlan.FREE &&
    billingData?.subscription?.status === "CANCELED" &&
    billingData?.recentPayments &&
    billingData.recentPayments.length > 0; // Has payment history

  // Get the last plan they had before canceling
  // For now, we'll use a default since we don't have historical plan data
  const lastPlan = subscriptionCanceled ? UserPlan.DEVELOPER : undefined;

  return (
    <BillingLayout isLoading={isLoading} error={!!error || !billingData}>
      {billingData && (
        <>
          <BillingHeader />

          <CurrentPlanCard
            subscription={billingData.subscription}
            stripeSubscription={billingData.stripeSubscription}
            paymentMethod={billingData.paymentMethod}
          />

          <SubscriptionManagement
            currentPlan={billingData.subscription?.plan || UserPlan.FREE}
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
