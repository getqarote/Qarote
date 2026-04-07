import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Calendar,
  Clock,
  CreditCard,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";

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
  const trialEndDate = useMemo(
    () => (subscription?.trialEnd ? new Date(subscription.trialEnd) : null),
    [subscription]
  );

  const price = stripeSubscription?.items?.data[0]?.price?.unit_amount || 0;
  const interval =
    stripeSubscription?.items?.data[0]?.price?.recurring?.interval || "";

  const handleCancelConfirm = async (data: {
    cancelImmediately: boolean;
    reason: string;
    feedback: string;
  }) => {
    await onCancelSubscription?.(data);
    setShowCancelModal(false);
  };

  const formatTrialDate = (date: Date) =>
    date.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Capture current time once on mount to avoid impure Date.now() in render
  const [now] = useState(() => Date.now());

  // Calculate trial progress percentage
  const trialProgress = useMemo(() => {
    if (!isTrialing || !trialEndDate || !stripeSubscription) return 0;
    const start = stripeSubscription.current_period_start * 1000;
    const end = trialEndDate.getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [isTrialing, trialEndDate, stripeSubscription, now]);

  const daysRemaining = useMemo(() => {
    if (!trialEndDate) return 0;
    const diff = trialEndDate.getTime() - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [trialEndDate, now]);

  return (
    <>
      <div className="space-y-4">
        {/* ── Plan Overview Card ── */}
        <Card className="overflow-hidden">
          <div className="relative">
            {/* Subtle gradient accent bar */}
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-orange-500 to-red-500" />

            <CardContent className="pt-8 pb-6 px-6">
              {/* Plan header row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t("currentPlan.planName", {
                        plan: getPlanDisplayName(plan),
                      })}
                    </h2>
                    <Badge
                      variant={isTrialing ? "outline" : "default"}
                      className={
                        isTrialing
                          ? "border-warning/40 text-warning bg-warning-muted"
                          : cancelAtPeriodEnd
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : ""
                      }
                    >
                      {isTrialing
                        ? t("trial.badge")
                        : cancelAtPeriodEnd
                          ? "Canceling"
                          : t("status.active", "Active")}
                    </Badge>
                  </div>
                  {interval && (
                    <p className="text-sm text-muted-foreground">
                      {t("currentPlan.billingInterval", { interval })}
                    </p>
                  )}
                </div>

                {/* Price display */}
                {stripeSubscription && (
                  <div className="text-left sm:text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">
                        {formatCurrency(price)}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        / {interval}
                      </span>
                    </div>
                    {isTrialing && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}{" "}
                        remaining in trial
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Trial progress bar */}
              {isTrialing && trialEndDate && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Trial started</span>
                    <span>Trial ends {formatTrialDate(trialEndDate)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-orange-500 to-red-500 transition-all duration-500"
                      style={{ width: `${trialProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* ── Billing Details Grid ── */}
        {stripeSubscription && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Period */}
            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    {t("currentPlan.currentPeriod")}
                  </span>
                </div>
                <p className="font-semibold text-sm">
                  {formatDate(
                    new Date(stripeSubscription.current_period_start * 1000)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  to{" "}
                  {formatDate(
                    new Date(stripeSubscription.current_period_end * 1000)
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Trial End / Next Billing */}
            <Card>
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    {isTrialing && trialEndDate
                      ? t("trial.endsOn")
                      : t("currentPlan.nextBilling")}
                  </span>
                </div>
                <p className="font-semibold text-sm">
                  {isTrialing && trialEndDate
                    ? formatDate(trialEndDate)
                    : formatDate(
                        new Date(stripeSubscription.current_period_end * 1000)
                      )}
                </p>
                {isTrialing && daysRemaining > 0 && (
                  <p className="text-xs text-warning mt-0.5 font-medium">
                    {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card data-testid="current-plan-payment-section">
              <CardContent className="pt-5 pb-5 px-5">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    {t("currentPlan.paymentMethod")}
                  </span>
                </div>
                {paymentMethod ? (
                  <button
                    onClick={onManagePaymentMethod}
                    className="group flex items-center gap-2 hover:text-primary transition-colors"
                    title={t("currentPlan.changePaymentMethod")}
                  >
                    <span className="font-semibold text-sm">
                      •••• {paymentMethod.card?.last4}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : onManagePaymentMethod ? (
                  <button
                    onClick={onManagePaymentMethod}
                    className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span>{t("trial.noPaymentMethod")}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("trial.noPaymentMethod")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Trial Status Banner ── */}
        {isTrialing && stripeSubscription && (
          <Card
            className={
              cancelAtPeriodEnd
                ? "border-destructive/30 bg-destructive/5"
                : "border-warning/30 bg-warning-muted/50"
            }
          >
            <CardContent className="py-5 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
                      cancelAtPeriodEnd ? "bg-destructive/10" : "bg-muted"
                    }`}
                  >
                    {cancelAtPeriodEnd ? (
                      <X className="w-4 h-4 text-destructive" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3
                      className={`font-semibold text-sm ${
                        cancelAtPeriodEnd
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {cancelAtPeriodEnd
                        ? t("trial.trialCanceled")
                        : t("trial.trialActive")}
                    </h3>
                    <p
                      className={`text-sm mt-0.5 ${
                        cancelAtPeriodEnd
                          ? "text-destructive/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {cancelAtPeriodEnd
                        ? t("trial.trialEndsOnDate", {
                            date: trialEndDate
                              ? formatTrialDate(trialEndDate)
                              : "",
                          })
                        : paymentMethod
                          ? t("trial.trialActiveWithPayment", {
                              date: trialEndDate
                                ? formatTrialDate(trialEndDate)
                                : "",
                            })
                          : t("trial.addPaymentToKeep", {
                              date: trialEndDate
                                ? formatTrialDate(trialEndDate)
                                : "",
                            })}
                    </p>
                  </div>
                </div>

                {/* CTA buttons */}
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
                  {isTrialing && onCancelSubscription && !cancelAtPeriodEnd && (
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
