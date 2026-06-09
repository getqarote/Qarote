import { useTranslation } from "react-i18next";

import { format } from "date-fns";
import { AlertTriangle, ExternalLink, Receipt } from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/analytics";
import { getDateFnsLocale } from "@/lib/dateFnsLocale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "@/contexts/AuthContext";

import {
  useBillingOverview,
  useBillingPortalSession,
} from "@/hooks/queries/useBilling";

const SUCCESS_STATUSES = new Set(["paid", "succeeded", "complete"]);

const Billing = () => {
  const { t, i18n } = useTranslation("portal");
  const dateLocale = getDateFnsLocale(i18n.language);
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useBillingOverview();
  const portalSession = useBillingPortalSession();

  const openStripePortal = () => {
    portalSession.mutate(undefined, {
      onSuccess: ({ url }) => {
        try {
          track("billing_portal_opened");
        } catch {
          // non-blocking analytics
        }
        window.location.href = url;
      },
      onError: () => {
        toast.error(t("billing.manageError"));
      },
    });
  };

  const payments = data?.recentPayments ?? [];
  const currency = (data?.stripeSubscription?.currency ?? "usd").toUpperCase();
  const formatAmount = (cents: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency,
    }).format(cents / 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="title-page">{t("billing.title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-prose">
          {t("billing.description")}
        </p>
      </div>

      {isLoading ? (
        <div
          className="grid gap-4"
          role="status"
          aria-live="polite"
          aria-label={t("billing.loading")}
        >
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-5 w-40 bg-muted rounded animate-pulse mb-3" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-7 w-7 icon-destructive mx-auto" />
            <p className="font-medium">{t("billing.errorLoading")}</p>
            <Button variant="outline" onClick={() => refetch()}>
              {t("billing.retry")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Manage billing — payment method + invoices live in the Stripe
              customer portal; we link out rather than re-implement them. */}
          <Card>
            <CardHeader>
              <CardTitle>{t("billing.manageTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("billing.manageHint")}
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {t("billing.contact")}
                  </span>{" "}
                  <span className="font-medium">{user?.email}</span>
                </div>
              </div>
              <Button
                onClick={openStripePortal}
                disabled={portalSession.isPending}
              >
                <ExternalLink className="h-4 w-4" />
                {portalSession.isPending
                  ? t("billing.manageOpening")
                  : t("billing.manageButton")}
              </Button>
            </CardContent>
          </Card>

          {/* Recent payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t("billing.recentPayments")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {t("billing.noPayments")}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {payments.map((p) => {
                    const isPaid = SUCCESS_STATUSES.has(p.status.toLowerCase());
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {p.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(p.createdAt), "PPP", {
                              locale: dateLocale,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-sm">
                            {formatAmount(p.amount)}
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              isPaid
                                ? "text-success bg-success/10"
                                : "text-muted-foreground bg-muted"
                            }`}
                          >
                            {t(`billing.status.${p.status.toLowerCase()}`, {
                              defaultValue: p.status,
                            })}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Billing;
