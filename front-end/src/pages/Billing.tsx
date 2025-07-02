import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  Users,
  Server,
  MessageSquare,
  Settings,
  Download,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import logger from "@/lib/logger";
import { WorkspacePlan } from "@/types/plans";
import { BillingOverviewResponse } from "@/lib/api/paymentClient";

const Billing: React.FC = () => {
  const { workspace, planData } = useWorkspace();

  const {
    data: billingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["billing", workspace?.id],
    queryFn: async (): Promise<BillingOverviewResponse> => {
      if (!workspace?.id) throw new Error("No workspace");
      return await apiClient.getBillingOverview();
    },
    enabled: !!workspace?.id,
  });

  const handleOpenBillingPortal = async () => {
    try {
      const data = await apiClient.createBillingPortalSession();
      window.open(data.url, "_blank");
    } catch (error) {
      logger.error("Failed to open billing portal:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !billingData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Unable to load billing information
          </h2>
          <p className="text-gray-600">
            Please try again later or contact support.
          </p>
        </div>
      </div>
    );
  }

  const {
    workspace: ws,
    subscription,
    stripeSubscription,
    upcomingInvoice,
    paymentMethod,
    currentUsage,
    recentPayments,
  } = billingData;

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

  const getUsagePercentage = (current: number, max: number | null): number => {
    if (!max) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="text-gray-600 mt-2">
            Manage your subscription and view usage details
          </p>
        </div>
        {subscription && (
          <Button
            onClick={handleOpenBillingPortal}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Billing
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Current Plan */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getPlanDisplayName(ws.plan)} Plan
                  <Badge
                    variant={
                      ws.plan === WorkspacePlan.FREE ? "secondary" : "default"
                    }
                  >
                    {subscription?.status || "Active"}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {ws.plan === WorkspacePlan.FREE
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

      {/* Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Servers</p>
                <p className="text-2xl font-bold">{currentUsage.servers}</p>
                <p className="text-xs text-gray-500">
                  of {planData?.planFeatures.maxServers || "∞"} max
                </p>
              </div>
              <Server className="w-8 h-8 text-blue-500" />
            </div>
            {planData?.planFeatures.maxServers && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.servers, planData.planFeatures.maxServers))} bg-current`}
                    style={{
                      width: `${getUsagePercentage(currentUsage.servers, planData.planFeatures.maxServers)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Users</p>
                <p className="text-2xl font-bold">{currentUsage.users}</p>
                <p className="text-xs text-gray-500">
                  of {planData?.planFeatures.maxUsers || "∞"} max
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
            {planData?.planFeatures.maxUsers && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.users, planData.planFeatures.maxUsers))} bg-current`}
                    style={{
                      width: `${getUsagePercentage(currentUsage.users, planData.planFeatures.maxUsers)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Queues</p>
                <p className="text-2xl font-bold">{currentUsage.queues}</p>
                <p className="text-xs text-gray-500">
                  of {planData?.planFeatures.maxQueues || "∞"} max
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            {planData?.planFeatures.maxQueues && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.queues, planData.planFeatures.maxQueues))} bg-current`}
                    style={{
                      width: `${getUsagePercentage(currentUsage.queues, planData.planFeatures.maxQueues)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages This Month</p>
                <p className="text-2xl font-bold">
                  {currentUsage.messagesThisMonth.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  of{" "}
                  {planData?.planFeatures.maxMessagesPerMonth?.toLocaleString() ||
                    "∞"}{" "}
                  max
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-orange-500" />
            </div>
            {planData?.planFeatures.maxMessagesPerMonth && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.messagesThisMonth, planData.planFeatures.maxMessagesPerMonth))} bg-current`}
                    style={{
                      width: `${getUsagePercentage(currentUsage.messagesThisMonth, planData.planFeatures.maxMessagesPerMonth)}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Invoice */}
      {upcomingInvoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Next billing date:{" "}
                  {formatDate(new Date(upcomingInvoice.period_end * 1000))}
                </p>
                <p className="text-sm text-gray-600">
                  {upcomingInvoice.lines.data
                    .map((line) => line.description)
                    .join(", ")}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {formatCurrency(upcomingInvoice.amount_due || 0)}
                </div>
                <div className="text-sm text-gray-600">
                  Due {formatDate(new Date(upcomingInvoice.period_end * 1000))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.description || "Subscription payment"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(new Date(payment.createdAt))}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(payment.amount)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Billing;
