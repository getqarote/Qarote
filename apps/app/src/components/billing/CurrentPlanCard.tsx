import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { Clock, CreditCard, X } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getPlanDisplayName, UserPlan } from "@/types/plans";

import { CancelSubscriptionModal } from "./CancelSubscriptionModal";

interface CurrentPlanCardProps {
  subscription?: {
    status: string;
    plan: UserPlan;
    trialEnd?: string | null;
  };
  stripeSubscription?: {
    items?: {
      data: Array<{
        price?: {
          unit_amount?: number;
          recurring?: {
            interval: string;
          };
        };
      }>;
    } | null;
    current_period_start: number;
    current_period_end: number;
  };
  paymentMethod?: {
    card?: {
      last4: string;
    };
  };
  onManagePaymentMethod?: () => void;
  onCancelSubscription?: (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => Promise<unknown>;
  isLoading?: boolean;
  cancelAtPeriodEnd?: boolean;
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  subscription,
  stripeSubscription,
  paymentMethod,
  onManagePaymentMethod,
  onCancelSubscription,
  isLoading,
  cancelAtPeriodEnd,
}) => {
  const { t, i18n } = useTranslation("billing");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const plan = subscription?.plan ?? UserPlan.FREE;
  const isTrialing = subscription?.status === "TRIALING";
  const trialEndDate = subscription?.trialEnd
    ? new Date(subscription.trialEnd)
    : null;

  const handleCancelConfirm = async (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => {
    await onCancelSubscription?.(data);
    setShowCancelModal(false);
  };

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t("currentPlan.planName", {
                    plan: getPlanDisplayName(plan),
                  })}
                  <Badge
                    variant={
                      isTrialing
                        ? "outline"
                        : plan === UserPlan.FREE
                          ? "secondary"
                          : "default"
                    }
                  >
                    {isTrialing
                      ? t("trial.badge")
                      : t("status.active", "Active")}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan === UserPlan.FREE
                    ? t("currentPlan.noSubscription")
                    : t("currentPlan.billingInterval", {
                        interval:
                          stripeSubscription?.items?.data[0]?.price?.recurring
                            ?.interval || "",
                      })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isTrialing && onCancelSubscription && (
                <Button
                  onClick={() => setShowCancelModal(true)}
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/20 hover:bg-destructive/10"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("trial.cancelTrial")}
                </Button>
              )}
              {stripeSubscription && (
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      stripeSubscription.items?.data[0]?.price?.unit_amount || 0
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("currentPlan.perInterval", {
                      interval:
                        stripeSubscription.items?.data[0]?.price?.recurring
                          ?.interval,
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        {stripeSubscription && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {t("currentPlan.currentPeriod")}
                </div>
                <div className="font-medium">
                  {formatDate(
                    new Date(stripeSubscription.current_period_start * 1000)
                  )}{" "}
                  -{" "}
                  {formatDate(
                    new Date(stripeSubscription.current_period_end * 1000)
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  {isTrialing && trialEndDate
                    ? t("trial.endsOn")
                    : t("currentPlan.nextBilling")}
                </div>
                <div className="font-medium">
                  {isTrialing && trialEndDate
                    ? formatDate(trialEndDate)
                    : formatDate(
                        new Date(stripeSubscription.current_period_end * 1000)
                      )}
                </div>
              </div>
              <div data-testid="current-plan-payment-section">
                <div className="text-sm text-muted-foreground">
                  {t("currentPlan.paymentMethod")}
                </div>
                <div className="font-medium flex items-center gap-2">
                  {paymentMethod ? (
                    <button
                      onClick={onManagePaymentMethod}
                      className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                      title={t("currentPlan.changePaymentMethod")}
                    >
                      <CreditCard className="w-4 h-4" />
                      •••• {paymentMethod.card?.last4}
                    </button>
                  ) : (
                    t("trial.noPaymentMethod")
                  )}
                </div>
              </div>
            </div>
            {isTrialing && (
              <div
                className={`rounded-lg p-4 border ${
                  cancelAtPeriodEnd
                    ? "bg-destructive/10 border-destructive/20"
                    : "bg-primary/10 border-primary/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    <Clock
                      className={`w-5 h-5 mt-0.5 ${cancelAtPeriodEnd ? "text-destructive" : "text-primary"}`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`font-medium mb-1 ${cancelAtPeriodEnd ? "text-destructive" : "text-primary"}`}
                    >
                      {cancelAtPeriodEnd
                        ? t("trial.trialCanceled")
                        : t("trial.trialActive")}
                    </h4>
                    <p
                      className={`text-sm ${cancelAtPeriodEnd ? "text-destructive/80" : "text-primary/80"}`}
                    >
                      {cancelAtPeriodEnd
                        ? t("trial.trialEndsOnDate", {
                            date: trialEndDate
                              ? trialEndDate.toLocaleDateString(i18n.language, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : "",
                          })
                        : paymentMethod
                          ? t("trial.trialActiveWithPayment", {
                              date: trialEndDate
                                ? trialEndDate.toLocaleDateString(
                                    i18n.language,
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )
                                : "",
                            })
                          : t("trial.addPaymentToKeep", {
                              date: trialEndDate
                                ? trialEndDate.toLocaleDateString(
                                    i18n.language,
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )
                                : "",
                            })}
                    </p>
                    {!cancelAtPeriodEnd &&
                      !paymentMethod &&
                      onManagePaymentMethod && (
                        <Button
                          onClick={onManagePaymentMethod}
                          size="sm"
                          className="mt-3"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          {t("trial.addPaymentMethod")}
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {onCancelSubscription && (
        <CancelSubscriptionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelConfirm}
          currentPlan={plan}
          periodEnd={
            stripeSubscription
              ? new Date(
                  stripeSubscription.current_period_end * 1000
                ).toISOString()
              : undefined
          }
          isLoading={isLoading}
        />
      )}
    </>
  );
};
