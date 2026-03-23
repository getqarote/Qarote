import React from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import {
  BillingHeader,
  BillingLayout,
  CurrentPlanCard,
  RecentPayments,
  SubscriptionManagement,
} from "@/components/billing";

import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

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
  const { t } = useTranslation("billing");
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const {
    data: billingData,
    isLoading,
    error,
  } = trpc.payment.billing.getBillingOverview.useQuery(undefined, {
    enabled: !!user.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - billing data doesn't change frequently
    refetchOnWindowFocus: true, // Refetch when returning from Stripe billing portal
    retry: (failureCount: number, error: unknown) => {
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

  const cancelSubscriptionMutation =
    trpc.payment.subscription.cancelSubscription.useMutation({
      onSuccess: (response: { message: string }) => {
        logger.info("Subscription canceled successfully", response);

        // Show success message to user
        if (response.message) {
          // You might want to show a toast notification here
          logger.info("Cancellation message:", response.message);
        }

        // Refetch billing data to update the UI
        queryClient.invalidateQueries({
          queryKey: ["billing", user.id, workspace?.id],
        });
      },
      onError: (error: Error) => {
        logger.error("Failed to cancel subscription:", error);
      },
    });

  const handleCancelSubscription = async (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => {
    try {
      return await cancelSubscriptionMutation.mutateAsync(data);
    } catch (error) {
      logger.error("Failed to cancel subscription:", error);
      throw error; // Re-throw so the modal can handle the error
    }
  };

  const createBillingPortalMutation =
    trpc.payment.billing.createBillingPortalSession.useMutation({
      onError: (error: Error) => {
        logger.error("Failed to open billing portal:", error);
        toast.error(t("error.failedToOpenBillingPortal"));
      },
    });

  const handleOpenBillingPortal = () => {
    createBillingPortalMutation.mutate(undefined, {
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url;
      },
    });
  };

  const renewSubscriptionMutation =
    trpc.payment.subscription.renewSubscription.useMutation({
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url;
      },
      onError: (error: Error) => {
        logger.error("Failed to renew subscription:", error);
      },
    });

  const handleRenewSubscription = async () => {
    try {
      // Determine the plan to renew based on subscription history
      const planToRenew = billingData?.subscription?.plan || UserPlan.DEVELOPER;
      renewSubscriptionMutation.mutate({
        plan: planToRenew,
        interval: "monthly",
      });
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

  const isTrialing = billingData?.subscription?.status === "TRIALING";
  const cancelAtPeriodEnd =
    (billingData?.stripeSubscription as ExtendedStripeSubscription)
      ?.cancel_at_period_end ||
    (billingData?.subscription as ExtendedSubscription)?.cancelAtPeriodEnd ||
    false;

  return (
    <BillingLayout isLoading={isLoading} error={!!error || !billingData}>
      {billingData && (
        <>
          <BillingHeader />

          <CurrentPlanCard
            subscription={billingData.subscription}
            stripeSubscription={billingData.stripeSubscription}
            paymentMethod={billingData.paymentMethod}
            onManagePaymentMethod={handleOpenBillingPortal}
            onCancelSubscription={
              isTrialing && !cancelAtPeriodEnd && billingData.paymentMethod
                ? handleCancelSubscription
                : undefined
            }
            isLoading={isLoading}
            cancelAtPeriodEnd={cancelAtPeriodEnd}
          />

          {!isTrialing && (
            <SubscriptionManagement
              currentPlan={billingData.subscription?.plan || UserPlan.FREE}
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
              cancelAtPeriodEnd={cancelAtPeriodEnd}
              subscriptionCanceled={subscriptionCanceled}
              lastPlan={lastPlan}
            />
          )}

          <RecentPayments recentPayments={billingData.recentPayments} />
        </>
      )}
    </BillingLayout>
  );
};

export default Billing;
