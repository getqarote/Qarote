import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Clock, RefreshCw } from "lucide-react";
import { UserPlan } from "@/types/plans";
import { CancelSubscriptionModal } from "./CancelSubscriptionModal";

interface CancelSubscriptionResponse {
  success: boolean;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
    canceledAt: string | null;
  };
  message: string;
}

interface SubscriptionManagementProps {
  currentPlan: UserPlan;
  onOpenBillingPortal: () => void;
  onUpgrade: (plan: UserPlan, interval: "monthly" | "yearly") => void;
  onRenewSubscription?: () => void;
  onCancelSubscription: (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => Promise<CancelSubscriptionResponse>;
  periodEnd?: string;
  isLoading?: boolean;
  cancelAtPeriodEnd?: boolean;
  subscriptionCanceled?: boolean; // True if user had a subscription but canceled it
  lastPlan?: UserPlan; // The plan they had before canceling
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  currentPlan,
  onRenewSubscription,
  onCancelSubscription,
  periodEnd,
  isLoading,
  cancelAtPeriodEnd,
  subscriptionCanceled = false,
  lastPlan,
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => {
    await onCancelSubscription(data);
    setShowCancelModal(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Subscription Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your plan, billing cycle, and subscription settings for
                all your workspaces
              </p>
            </div>
            {/* Subscription Actions */}
            {currentPlan === UserPlan.FREE &&
            subscriptionCanceled &&
            lastPlan &&
            onRenewSubscription ? (
              // Show renew button for canceled subscriptions
              <Button
                onClick={onRenewSubscription}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Renew {lastPlan} Plan
              </Button>
            ) : currentPlan !== UserPlan.FREE ? (
              // Show cancel/pending cancellation for active paid plans
              <>
                {cancelAtPeriodEnd ? (
                  <div className="flex items-center gap-3">
                    {/* Show renewal option alongside cancellation notice */}
                    {onRenewSubscription && (
                      <Button
                        onClick={onRenewSubscription}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={isLoading}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reactivate Subscription
                      </Button>
                    )}
                    <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-2 rounded-md border border-primary/20">
                      <Clock className="w-4 h-4" />
                      <div className="text-sm">
                        <div className="font-medium">Subscription ending</div>
                        <div className="text-xs text-primary/80">
                          Will end on{" "}
                          {periodEnd
                            ? new Date(periodEnd).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "end of period"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleCancelClick}
                    variant="outline"
                    className="text-destructive border-destructive/20 hover:bg-destructive/10"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                )}
              </>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {/* Subscription Status Information */}
          {currentPlan === UserPlan.FREE && subscriptionCanceled && lastPlan ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
                </div>
                <div>
                  <h4 className="font-medium text-primary mb-1">
                    Ready to come back?
                  </h4>
                  <p className="text-sm text-primary/80 mb-3">
                    Your {lastPlan} plan subscription was canceled, but you can
                    easily restart it anytime. You'll get all the same great
                    features you had before across all your workspaces.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        currentPlan={currentPlan}
        periodEnd={periodEnd}
        isLoading={isLoading}
      />
    </>
  );
};
