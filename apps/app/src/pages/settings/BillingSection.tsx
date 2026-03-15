import { CreditCard, ExternalLink, Loader2 } from "lucide-react";

import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrgBillingInfo } from "@/hooks/queries/useOrganization";

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-800",
  DEVELOPER: "bg-blue-100 text-blue-800",
  ENTERPRISE: "bg-purple-100 text-purple-800",
};

const BillingSection = () => {
  const { data: billingInfo, isLoading } = useOrgBillingInfo();

  const createPortalMutation =
    trpc.payment.billing.createBillingPortalSession.useMutation({
      onSuccess: (data: { url: string }) => {
        window.open(data.url, "_blank", "noopener,noreferrer");
      },
      onError: (error: Error) => {
        logger.error("Failed to open billing portal:", error);
      },
    });

  const handleOpenPortal = () => {
    createPortalMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">Billing</h2>
            <p className="text-sm text-muted-foreground">
              No organization billing information available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const subscription = billingInfo.subscription;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-semibold">Billing</h2>
          <p className="text-sm text-muted-foreground">
            Manage your organization's subscription and billing
          </p>
        </div>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your organization's active subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              className={PLAN_COLORS[billingInfo.plan] ?? PLAN_COLORS.FREE}
            >
              {billingInfo.plan}
            </Badge>
            {subscription && (
              <Badge variant="outline">{subscription.status}</Badge>
            )}
          </div>

          {subscription && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Billing interval</span>
                <span>{subscription.billingInterval}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Current period ends
                </span>
                <span>
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              {subscription.cancelAtPeriodEnd && (
                <div className="flex justify-between">
                  <span className="text-destructive font-medium">
                    Cancels at period end
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Billing */}
      {billingInfo.stripeCustomerId && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Billing</CardTitle>
            <CardDescription>
              Update payment methods, view invoices, and manage your
              subscription via the Stripe billing portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-gradient-button hover:bg-gradient-button-hover text-white"
              onClick={handleOpenPortal}
              disabled={createPortalMutation.isPending}
            >
              {createPortalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Billing Portal
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillingSection;
