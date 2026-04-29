import React from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { usePostHog } from "@posthog/react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import {
  BillingHeader,
  CurrentPlanCard,
  RecentPayments,
  SubscriptionManagement,
} from "@/components/billing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

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

/**
 * Billing detail view mounted at `/settings/subscription/billing`.
 * Rendered inside the Settings layout's `<Outlet>`, so the settings
 * sidebar (with "Subscription" highlighted) is the back affordance —
 * this component only owns the content inside the outlet and does
 * not wrap itself in a PageShell or a standalone back button.
 */
const Billing: React.FC = () => {
  const { t } = useTranslation("billing");
  const posthog = usePostHog();
  const { user } = useUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  const {
    data: billingData,
    isLoading,
    error,
  } = trpc.payment.billing.getBillingOverview.useQuery(undefined, {
    enabled: !!user.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: (failureCount: number, error: unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 429
      ) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const cancelSubscriptionMutation =
    trpc.payment.subscription.cancelSubscription.useMutation({
      onSuccess: (response: { message: string }) => {
        logger.info("Subscription canceled successfully", response);

        if (response.message) {
          logger.info("Cancellation message:", response.message);
        }

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
    const result = await cancelSubscriptionMutation.mutateAsync(data);
    try {
      posthog?.capture("subscription_canceled", {
        cancel_immediately: data.cancelImmediately,
        reason: data.reason,
        plan: billingData?.subscription?.plan,
      });
    } catch {
      // non-blocking analytics
    }
    return result;
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
      const planToRenew = billingData?.subscription?.plan || UserPlan.DEVELOPER;
      renewSubscriptionMutation.mutate({
        plan: planToRenew,
        interval: "monthly",
      });
    } catch (error) {
      logger.error("Failed to renew subscription:", error);
    }
  };

  const subscriptionCanceled =
    billingData?.subscription?.plan === UserPlan.FREE &&
    billingData?.subscription?.status === "CANCELED" &&
    billingData?.recentPayments &&
    billingData.recentPayments.length > 0;

  const lastPlan = subscriptionCanceled ? UserPlan.DEVELOPER : undefined;

  const isTrialing = billingData?.subscription?.status === "TRIALING";
  const cancelAtPeriodEnd =
    (billingData?.stripeSubscription as ExtendedStripeSubscription)
      ?.cancel_at_period_end ||
    (billingData?.subscription as ExtendedSubscription)?.cancelAtPeriodEnd ||
    false;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !billingData) {
    return (
      <div className="space-y-6">
        <BillingHeader />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.loadTitle")}</AlertTitle>
          <AlertDescription>{t("errors.loadDescription")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
    </div>
  );
};

export default Billing;
