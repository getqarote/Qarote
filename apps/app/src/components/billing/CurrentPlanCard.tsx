import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Calendar, Clock, CreditCard, ExternalLink } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  const { trialProgress, daysRemaining } = useMemo(() => {
    if (!isTrialing || !trialEndDate || !stripeSubscription) {
      return { trialProgress: 0, daysRemaining: 0 };
    }
    const start = stripeSubscription.current_period_start * 1000;
    const end = trialEndDate.getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    const progress =
      total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    const remaining = Math.max(
      0,
      Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    );
    return { trialProgress: progress, daysRemaining: remaining };
  }, [isTrialing, trialEndDate, stripeSubscription]);

  const handleCancelConfirm = async (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => {
    await onCancelSubscription?.(data);
    setShowCancelModal(false);
  };

  const formatLocalDate = (date: Date) =>
    date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <>
      {/* Plan Overview */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-linear-to-r from-orange-500 to-red-500" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-semibold">
                  {t("currentPlan.planName", {
                    plan: getPlanDisplayName(plan),
                  })}
                </h2>
                <Badge
                  variant={
                    cancelAtPeriodEnd
                      ? "destructive"
                      : isTrialing
                        ? "outline"
                        : "default"
                  }
                  className="text-xs"
                >
                  {cancelAtPeriodEnd
                    ? t("trial.trialCanceled")
                    : isTrialing
                      ? t("trial.badge")
                      : t("status.active", "Active")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {plan === UserPlan.FREE
                  ? t("currentPlan.noSubscription")
                  : t("currentPlan.billingInterval", {
                      interval:
                        stripeSubscription?.items?.data[0]?.price?.recurring
                          ?.interval || "",
                    })}
              </p>
            </div>
            {stripeSubscription && (
              <div className="text-left sm:text-right">
                <div className="text-3xl font-bold tabular-nums">
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

          {/* Trial progress bar */}
          {isTrialing && !cancelAtPeriodEnd && trialEndDate && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Trial progress</span>
                <span className="font-medium text-orange-600">
                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"}{" "}
                  remaining
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-linear-to-r from-orange-500 to-red-500 transition-all duration-500"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Details Grid */}
      {stripeSubscription && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-muted">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("currentPlan.currentPeriod")}
                </span>
              </div>
              <p className="font-medium text-sm">
                {formatDate(
                  new Date(stripeSubscription.current_period_start * 1000)
                )}{" "}
                –{" "}
                {formatDate(
                  new Date(stripeSubscription.current_period_end * 1000)
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-muted">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {isTrialing && trialEndDate
                    ? t("trial.endsOn")
                    : t("currentPlan.nextBilling")}
                </span>
              </div>
              <p className="font-medium text-sm">
                {isTrialing && trialEndDate
                  ? formatDate(trialEndDate)
                  : formatDate(
                      new Date(stripeSubscription.current_period_end * 1000)
                    )}
              </p>
              {isTrialing && daysRemaining > 0 && (
                <p className="text-xs text-orange-600 mt-1 font-medium">
                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                </p>
              )}
            </CardContent>
          </Card>

          <Card
            className={`group ${onManagePaymentMethod ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}`}
            onClick={paymentMethod ? onManagePaymentMethod : undefined}
            data-testid="current-plan-payment-section"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-muted">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("currentPlan.paymentMethod")}
                </span>
                {paymentMethod && (
                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <p className="font-medium text-sm flex items-center gap-1.5">
                {paymentMethod ? (
                  <>
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    •••• {paymentMethod.card?.last4}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    {t("trial.noPaymentMethod")}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trial Status Banner */}
      {isTrialing && (
        <Card
          className={`border ${
            cancelAtPeriodEnd
              ? "border-destructive/20 bg-destructive/5"
              : "border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/20"
          }`}
        >
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Clock
                  className={`w-5 h-5 mt-0.5 shrink-0 ${
                    cancelAtPeriodEnd ? "text-destructive" : "text-orange-600"
                  }`}
                />
                <div>
                  <h4
                    className={`font-medium text-sm ${
                      cancelAtPeriodEnd
                        ? "text-destructive"
                        : "text-orange-700 dark:text-orange-400"
                    }`}
                  >
                    {cancelAtPeriodEnd
                      ? t("trial.trialCanceled")
                      : t("trial.trialActive")}
                  </h4>
                  <p
                    className={`text-sm mt-0.5 ${
                      cancelAtPeriodEnd
                        ? "text-destructive/80"
                        : "text-orange-600/80 dark:text-orange-400/70"
                    }`}
                  >
                    {cancelAtPeriodEnd
                      ? t("trial.trialEndsOnDate", {
                          date: trialEndDate
                            ? formatLocalDate(trialEndDate)
                            : "",
                        })
                      : paymentMethod
                        ? t("trial.trialActiveWithPayment", {
                            date: trialEndDate
                              ? formatLocalDate(trialEndDate)
                              : "",
                          })
                        : t("trial.addPaymentToKeep", {
                            date: trialEndDate
                              ? formatLocalDate(trialEndDate)
                              : "",
                          })}
                  </p>
                </div>
              </div>

              {!cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 sm:shrink-0">
                  {!paymentMethod && onManagePaymentMethod && (
                    <Button
                      onClick={onManagePaymentMethod}
                      size="sm"
                      className="btn-primary"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t("trial.addPaymentMethod")}
                    </Button>
                  )}
                  {paymentMethod && onCancelSubscription && (
                    <Button
                      onClick={() => setShowCancelModal(true)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={isLoading}
                    >
                      {t("trial.cancelTrial")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
