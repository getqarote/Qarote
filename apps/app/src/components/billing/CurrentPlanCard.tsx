import React from "react";
import { useTranslation } from "react-i18next";

import { CreditCard } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getPlanDisplayName, UserPlan } from "@/types/plans";

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
  onAddPaymentMethod?: () => void;
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  subscription,
  stripeSubscription,
  paymentMethod,
  onAddPaymentMethod,
}) => {
  const { t } = useTranslation("billing");
  const plan = subscription?.plan ?? UserPlan.FREE;
  const isTrialing = subscription?.status === "TRIALING";
  const trialEndDate = subscription?.trialEnd
    ? new Date(subscription.trialEnd)
    : null;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {getPlanDisplayName(plan)} Plan
                <Badge
                  variant={
                    isTrialing
                      ? "outline"
                      : plan === UserPlan.FREE
                        ? "secondary"
                        : "default"
                  }
                >
                  {isTrialing ? t("trial.badge") : t("status.active", "Active")}
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
      </CardHeader>
      {stripeSubscription && (
        <CardContent>
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
                  <>
                    <CreditCard className="w-4 h-4" />
                    •••• {paymentMethod.card?.last4}
                  </>
                ) : isTrialing && onAddPaymentMethod ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddPaymentMethod}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t("trial.addPaymentMethod")}
                  </Button>
                ) : (
                  t("trial.noPaymentMethod")
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
