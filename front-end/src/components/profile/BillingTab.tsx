import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Circle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import logger from "@/lib/logger";
import { apiClient } from "@/lib/api";
import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import { WorkspacePlan } from "@/types/plans";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Subscription {
  id: string;
  plan: WorkspacePlan;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  paidAt: string;
  receiptUrl?: string;
  // Fields used in the UI but may not be returned by API
  plan?: string;
  periodStart?: string;
  periodEnd?: string;
  failureMessage?: string;
  invoiceUrl?: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "succeeded":
    case "active":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "failed":
    case "canceled":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "past_due":
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    default:
      return <Circle className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "succeeded":
    case "active":
      return "bg-green-100 text-green-800";
    case "failed":
    case "canceled":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "past_due":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const BillingTab: React.FC = () => {
  const { planData } = useWorkspace();
  const { openCustomerPortal, isUpgrading } = usePlanUpgrade();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await apiClient.getSubscription();
      setSubscription(data.subscription);
    } catch (error) {
      logger.error("Error fetching subscription:", error);
    }
  }, []);

  const fetchPayments = useCallback(async (offset = 0, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const data = await apiClient.getPaymentHistory(20, offset);

      if (append) {
        setPayments((prev) => [...prev, ...data.payments]);
      } else {
        setPayments(data.payments);
      }

      setPagination(data.pagination);
    } catch (error) {
      logger.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchSubscription();
      await fetchPayments();
    };
    loadData();
  }, [fetchSubscription, fetchPayments]);

  const loadMorePayments = () => {
    if (pagination.hasMore && !loadingMore) {
      fetchPayments(pagination.offset + pagination.limit, true);
    }
  };

  const formatCurrency = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">
                Loading billing information...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {planData?.planFeatures?.displayName || subscription.plan}{" "}
                    Plan
                  </h3>
                  <p className="text-sm text-gray-600">
                    {planData?.planFeatures ? (
                      <>
                        {formatCurrency(
                          subscription.billingInterval === "yearly" ||
                            subscription.billingInterval === "YEAR"
                            ? planData.planFeatures.yearlyPrice
                            : planData.planFeatures.monthlyPrice,
                          "usd"
                        )}
                        {subscription.billingInterval === "yearly" ||
                        subscription.billingInterval === "YEAR"
                          ? "/year"
                          : "/month"}
                      </>
                    ) : (
                      `${subscription.plan} Plan`
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(subscription.status)}
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status.charAt(0).toUpperCase() +
                      subscription.status.slice(1).toLowerCase()}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Billing Period
                  </h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(subscription.currentPeriodStart)} -{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Next Billing Date
                  </h4>
                  <p className="text-sm text-gray-600">
                    {subscription.cancelAtPeriodEnd
                      ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                      : formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>

              {subscription.cancelAtPeriodEnd && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      Your subscription will be canceled at the end of the
                      current period.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={openCustomerPortal}
                  disabled={isUpgrading}
                  className="flex-1"
                >
                  {isUpgrading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Subscription
              </h3>
              <p className="text-gray-600 mb-4">
                You're currently on the Free plan. Upgrade to unlock more
                features.
              </p>
              <Button onClick={() => (window.location.href = "/plans")}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {payment.description || `${payment.plan} Plan`}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(payment.paidAt)}
                        {payment.periodStart && payment.periodEnd && (
                          <span className="ml-2">
                            ({formatDate(payment.periodStart)} -{" "}
                            {formatDate(payment.periodEnd)})
                          </span>
                        )}
                      </p>
                      {payment.failureMessage && (
                        <p className="text-sm text-red-600 mt-1">
                          {payment.failureMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status.charAt(0).toUpperCase() +
                          payment.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>

                    {(payment.receiptUrl || payment.invoiceUrl) && (
                      <div className="flex gap-1">
                        {payment.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(payment.receiptUrl, "_blank")
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {payment.invoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(payment.invoiceUrl, "_blank")
                            }
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {pagination.hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={loadMorePayments}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Payment History
              </h3>
              <p className="text-gray-600">
                Your payment history will appear here once you make your first
                payment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
