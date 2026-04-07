import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Clock, RefreshCw, Settings, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
        <CardContent className="pt-6 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {t("subscriptionManagement.title")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("subscriptionManagement.description")}
                </p>
              </div>
            </div>

            {/* Subscription Actions */}
            <div className="flex items-center gap-2">
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
                  {t("subscriptionManagement.renewPlan", { plan: lastPlan })}
                </Button>
              ) : currentPlan !== UserPlan.FREE ? (
                <>
                  {cancelAtPeriodEnd ? (
                    <div className="flex items-center gap-3">
                      {onRenewSubscription && (
                        <Button
                          onClick={onRenewSubscription}
                          size="sm"
                          className="btn-primary"
                          disabled={isLoading}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t("subscriptionManagement.reactivate")}
                        </Button>
                      )}
                      <Badge
                        variant="outline"
                        className="border-warning/40 text-warning bg-warning-muted py-1.5 px-3"
                      >
                        <Clock className="w-3 h-3 mr-1.5" />
                        {periodEnd
                          ? t("subscriptionManagement.endsOn", {
                              date: new Date(periodEnd).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" }
                              ),
                            })
                          : t("subscriptionManagement.endsSoon")}
                      </Badge>
                    </div>
                  ) : (
                    <Button
                      onClick={handleCancelClick}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t("subscriptionManagement.cancelSubscription")}
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Renewal CTA for canceled users */}
          {currentPlan === UserPlan.FREE &&
            subscriptionCanceled &&
            lastPlan && (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-full p-1.5 bg-warning-muted mt-0.5">
                    <RefreshCw className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {t("subscriptionManagement.readyToComeBack")}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t("subscriptionManagement.renewDescription", {
                        plan: lastPlan,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
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
