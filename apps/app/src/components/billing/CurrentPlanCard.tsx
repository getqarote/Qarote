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

/**
 * Single consolidated card rendering the operator's active
 * subscription: plan name + status badge, price, billing period,
 * trial end / next billing date, payment method, and — when
 * applicable — the trial progress bar and trial CTA row.
 *
 * Previously this lived as 3–4 stacked cards (overview + 3-cell
 * grid + trial banner) with a decorative gradient stripe; now
 * it's one Card using internal dividers so the page reads as one
 * content object instead of a pile of mini-cards.
 */
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

  const statusBadge = isTrialing ? (
    <Badge
      variant="outline"
      className="border-warning/40 text-warning bg-warning-muted"
    >
      {t("trial.badge")}
    </Badge>
  ) : cancelAtPeriodEnd ? (
    <Badge
      variant="outline"
      className="border-destructive/30 text-destructive bg-destructive/10"
    >
      {t("currentPlan.canceling")}
    </Badge>
  ) : (
    <Badge variant="outline">{t("status.active")}</Badge>
  );

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Plan header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold leading-tight">
                {t("currentPlan.planName", {
                  plan: getPlanDisplayName(plan),
                })}
              </h2>
              {statusBadge}
            </div>
            {interval && (
              <p className="text-sm text-muted-foreground">
                {t("currentPlan.billingInterval", { interval })}
              </p>
            )}
          </div>

          {stripeSubscription && (
            <div className="text-left sm:text-right shrink-0">
              <div className="flex items-baseline gap-1 sm:justify-end">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(price)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {interval}
                </span>
              </div>
              {isTrialing && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("trial.daysRemaining", { count: daysRemaining })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Trial progress bar */}
        {isTrialing && trialEndDate && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{t("trial.started")}</span>
              <span>
                {t("trial.endsDate", { date: formatTrialDate(trialEndDate) })}
              </span>
            </div>
            <div
              className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={trialProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${trialProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Billing details row */}
        {stripeSubscription && (
          <dl className="grid grid-cols-1 sm:grid-cols-3 border-t border-border">
            {/* Current period */}
            <div className="p-6 sm:border-r border-border">
              <dt className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t("currentPlan.currentPeriod")}
                </span>
              </dt>
              <dd className="text-sm font-medium">
                {formatDate(
                  new Date(stripeSubscription.current_period_start * 1000)
                )}
              </dd>
              <dd className="text-xs text-muted-foreground mt-0.5">
                {t("currentPlan.toDate", {
                  date: formatDate(
                    new Date(stripeSubscription.current_period_end * 1000)
                  ),
                })}
              </dd>
            </div>

            {/* Trial end / Next billing */}
            <div className="p-6 border-t sm:border-t-0 sm:border-r border-border">
              <dt className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {isTrialing && trialEndDate
                    ? t("trial.endsOn")
                    : t("currentPlan.nextBilling")}
                </span>
              </dt>
              <dd className="text-sm font-medium">
                {isTrialing && trialEndDate
                  ? formatDate(trialEndDate)
                  : formatDate(
                      new Date(stripeSubscription.current_period_end * 1000)
                    )}
              </dd>
              {isTrialing && daysRemaining > 0 && (
                <dd className="text-xs text-warning mt-0.5 font-medium">
                  {t("trial.daysLeft", { count: daysRemaining })}
                </dd>
              )}
            </div>

            {/* Payment method */}
            <div
              className="p-6 border-t sm:border-t-0 border-border"
              data-testid="current-plan-payment-section"
            >
              <dt className="flex items-center gap-2 text-muted-foreground mb-2">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t("currentPlan.paymentMethod")}
                </span>
              </dt>
              <dd>
                {paymentMethod ? (
                  <button
                    type="button"
                    onClick={onManagePaymentMethod}
                    className="group inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                    aria-label={t("currentPlan.changePaymentMethod")}
                  >
                    <span className="tabular-nums">
                      •••• {paymentMethod.card?.last4}
                    </span>
                    <ExternalLink
                      className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </button>
                ) : onManagePaymentMethod ? (
                  <button
                    type="button"
                    onClick={onManagePaymentMethod}
                    className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span>{t("trial.noPaymentMethod")}</span>
                    <ExternalLink
                      className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("trial.noPaymentMethod")}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        )}

        {/* Trial status footer */}
        {isTrialing && stripeSubscription && (
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-t ${
              cancelAtPeriodEnd
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`mt-0.5 shrink-0 rounded-full p-1.5 ${
                  cancelAtPeriodEnd ? "bg-destructive/10" : "bg-background"
                }`}
                aria-hidden="true"
              >
                {cancelAtPeriodEnd ? (
                  <X className="h-4 w-4 text-destructive" />
                ) : (
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <h3
                  className={`font-semibold text-sm ${
                    cancelAtPeriodEnd ? "text-destructive" : "text-foreground"
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
                        date: trialEndDate ? formatTrialDate(trialEndDate) : "",
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

            <div className="flex items-center gap-2 sm:shrink-0">
              {!paymentMethod && onManagePaymentMethod && (
                <Button onClick={onManagePaymentMethod} size="sm">
                  <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
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
