import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { WorkspacePlan } from "@/types/plans";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CurrentPlanCardProps {
  workspace: {
    plan: WorkspacePlan;
  };
  subscription?: {
    status: string;
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
  workspace,
  subscription,
  stripeSubscription,
  paymentMethod,
}) => {
  const getPlanDisplayName = (plan: WorkspacePlan): string => {
    switch (plan) {
      case WorkspacePlan.FREE:
        return "Free";
      case WorkspacePlan.DEVELOPER:
        return "Developer";
      case WorkspacePlan.STARTUP:
        return "Startup";
      case WorkspacePlan.BUSINESS:
        return "Business";
      default:
        return "Unknown";
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {getPlanDisplayName(workspace.plan)} Plan
                <Badge
                  variant={
                    workspace.plan === WorkspacePlan.FREE
                      ? "secondary"
                      : "default"
                  }
                >
                  {subscription?.status || "Active"}
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {workspace.plan === WorkspacePlan.FREE
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
              <div className="text-sm text-gray-600">
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
              <div className="text-sm text-gray-600">Current Period</div>
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
              <div className="text-sm text-gray-600">Next Billing</div>
              <div className="font-medium">
                {formatDate(
                  new Date(stripeSubscription.current_period_end * 1000)
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Payment Method</div>
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
