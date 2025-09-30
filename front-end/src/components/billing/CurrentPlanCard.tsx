import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { UserPlan } from "@/types/plans";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CurrentPlanCardProps {
  subscription?: {
    status: string;
    plan: UserPlan;
  };
  stripeSubscription?: {
    items: {
      data: Array<{
        price?: {
          unit_amount?: number;
          recurring?: {
            interval: string;
          };
        };
      }>;
    };
    current_period_start: number;
    current_period_end: number;
  };
  paymentMethod?: {
    card?: {
      last4: string;
    };
  };
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  subscription,
  stripeSubscription,
  paymentMethod,
}) => {
  const getPlanDisplayName = (plan: UserPlan): string => {
    switch (plan) {
      case UserPlan.FREE:
        return "Free";
      case UserPlan.DEVELOPER:
        return "Developer";
      case UserPlan.ENTERPRISE:
        return "Enterprise";
      default:
        return UserPlan.FREE;
    }
  };

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
                {getPlanDisplayName(subscription?.plan)} Plan
                <Badge
                  variant={
                    subscription?.plan === UserPlan.FREE
                      ? "secondary"
                      : "default"
                  }
                >
                  {subscription?.status || "Active"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {subscription?.plan === UserPlan.FREE
                  ? "No subscription required"
                  : `${stripeSubscription?.items?.data[0]?.price?.recurring?.interval || ""} billing`}
              </p>
            </div>
          </div>
          {stripeSubscription && (
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatCurrency(
                  stripeSubscription.items.data[0]?.price?.unit_amount || 0
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                per{" "}
                {stripeSubscription.items.data[0]?.price?.recurring?.interval}
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
                Current Period
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
              <div className="text-sm text-muted-foreground">Next Billing</div>
              <div className="font-medium">
                {formatDate(
                  new Date(stripeSubscription.current_period_end * 1000)
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Payment Method
              </div>
              <div className="font-medium flex items-center gap-2">
                {paymentMethod ? (
                  <>
                    <CreditCard className="w-4 h-4" />
                    •••• {paymentMethod.card?.last4}
                  </>
                ) : (
                  "No payment method"
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
