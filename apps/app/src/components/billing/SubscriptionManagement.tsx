import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { RefreshCw, Settings, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  onRenewSubscription?: () => void;
  onCancelSubscription: (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => Promise<CancelSubscriptionResponse>;
  periodEnd?: string;
  isLoading?: boolean;
  cancelAtPeriodEnd?: boolean;
  subscriptionCanceled?: boolean;
  lastPlan?: UserPlan;
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
  const { t } = useTranslation("billing");
  const [showCancelModal, setShowCancelModal] = useState(false);

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
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-muted">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-sm">
                  {t("subscriptionManagement.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("subscriptionManagement.description")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              {currentPlan === UserPlan.FREE &&
              subscriptionCanceled &&
              lastPlan &&
              onRenewSubscription ? (
                <Button
                  onClick={onRenewSubscription}
                  size="sm"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Renew {lastPlan} Plan
                </Button>
              ) : currentPlan !== UserPlan.FREE ? (
                <>
                  {cancelAtPeriodEnd ? (
                    <>
                      {onRenewSubscription && (
                        <Button
                          onClick={onRenewSubscription}
                          size="sm"
                          className="btn-primary"
                          disabled={isLoading}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reactivate
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Ends{" "}
                        {periodEnd
                          ? new Date(periodEnd).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "at end of period"}
                      </span>
                    </>
                  ) : (
                    <Button
                      onClick={() => setShowCancelModal(true)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={isLoading}
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Cancel Subscription
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {currentPlan === UserPlan.FREE && subscriptionCanceled && lastPlan && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm text-orange-700 dark:text-orange-400 mb-1">
                  Ready to come back?
                </h4>
                <p className="text-sm text-orange-600/80 dark:text-orange-400/70">
                  Your {lastPlan} plan subscription was canceled, but you can
                  easily restart it anytime. You'll get all the same great
                  features you had before across all your workspaces.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
