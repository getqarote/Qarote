import { useTranslation } from "react-i18next";

import { format } from "date-fns";
import { AlertTriangle, CreditCard, ExternalLink, Receipt } from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/analytics";
import { getDateFnsLocale } from "@/lib/dateFnsLocale";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const card = data?.paymentMethod?.card ?? null;
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
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          {/* Invoices — payments are recorded locally; the downloadable PDFs
              live in the Stripe customer portal, so the action links out. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t("billing.invoicesTitle")}
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
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
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
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              isPaid ? "text-success" : "text-muted-foreground"
                            }`}
                          >
                            <span aria-hidden="true">●</span>
                            {t(`billing.status.${p.status.toLowerCase()}`, {
                              defaultValue: p.status,
                            })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={openStripePortal}
                            disabled={portalSession.isPending}
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("billing.invoicePdf")}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            {/* Payment method — read from Stripe; editing happens in the portal. */}
            <Card>
              <CardHeader>
                <CardTitle>{t("billing.paymentMethodTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                {card ? (
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">
                        {t("billing.cardLabel", {
                          brand: card.brand,
                          last4: card.last4,
                        })}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {t("billing.cardExpires", {
                          month: String(card.exp_month).padStart(2, "0"),
                          year: String(card.exp_year).slice(-2),
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={openStripePortal}
                      disabled={portalSession.isPending}
                    >
                      {t("billing.update")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t("billing.noPaymentMethod")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openStripePortal}
                      disabled={portalSession.isPending}
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t("billing.addPaymentMethod")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing contact — the email of record; managed in the portal. */}
            <Card>
              <CardHeader>
                <CardTitle>{t("billing.contactTitle")}</CardTitle>
                <CardDescription>{t("billing.contactHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="billing-contact-email">
                    {t("billing.contactEmail")}
                  </Label>
                  <Input
                    id="billing-contact-email"
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openStripePortal}
                  disabled={portalSession.isPending}
                >
                  <ExternalLink className="h-4 w-4" />
                  {portalSession.isPending
                    ? t("billing.manageOpening")
                    : t("billing.update")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
