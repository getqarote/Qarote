import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";

import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { track } from "@/lib/analytics";
import { isSelfHostedMode } from "@/lib/featureFlags";
import { logger } from "@/lib/logger";
import { trpc } from "@/lib/trpc/client";
import { cn, formatCurrency } from "@/lib/utils";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChevronRight, IconKey } from "@/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { getPlanDisplayName, UserPlan } from "@/types/plans";

interface ExtendedSubscription {
  cancelAtPeriodEnd?: boolean;
  trialEnd?: string | null;
  [key: string]: unknown;
}

interface ExtendedStripeSubscription {
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  trial_end?: number | null;
  items?: {
    data?: Array<{
      price?: {
        unit_amount?: number | null;
        recurring?: { interval?: string } | null;
      } | null;
    }>;
  };
  [key: string]: unknown;
}

const CANCEL_REASONS = [
  "tooExpensive",
  "missingFeature",
  "switchingTools",
  "exploring",
  "other",
] as const;

/** Carrot statuspill, mapped from the subscription status enum. */
function StatusPill({ status }: { status?: string }) {
  const { t } = useTranslation("billing");
  const map: Record<string, { cls: string; label: string }> = {
    ACTIVE: {
      cls: "border-success/40 bg-success-muted text-success",
      label: t("status.active"),
    },
    TRIALING: {
      cls: "border-primary/40 bg-accent text-primary",
      label: t("trial.badge"),
    },
    PAST_DUE: {
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
      label: t("statusPill.pastDue"),
    },
    CANCELED: {
      cls: "border-border text-muted-foreground",
      label: t("statusPill.canceled"),
    },
  };
  const s = status ? (map[status] ?? map.ACTIVE) : map.ACTIVE;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.05em]",
        s.cls
      )}
    >
      {s.label}
    </span>
  );
}

function SectionHead({ sub }: { sub: string }) {
  const { t } = useTranslation("billing");
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">
        {t("section.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

const SubscriptionSection = () => {
  const { t, i18n } = useTranslation("billing");
  const { user, userPlan, planData } = useUser();
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const { data: orgData } = useCurrentOrganization();
  const isAdmin = orgData?.role === "OWNER" || orgData?.role === "ADMIN";
  const selfHosted = isSelfHostedMode();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const {
    data: billingData,
    isLoading,
    error,
  } = trpc.payment.billing.getBillingOverview.useQuery(undefined, {
    enabled: isAdmin && !!user.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: (failureCount: number, err: unknown) => {
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        err.status === 429
      )
        return false;
      return failureCount < 1;
    },
  });

  const cancelSubscriptionMutation =
    trpc.payment.subscription.cancelSubscription.useMutation({
      onSuccess: (response: { message: string }) => {
        logger.info("Subscription canceled", response);
        queryClient.invalidateQueries({
          queryKey: ["billing", user.id, workspace?.id],
        });
        setCancelOpen(false);
      },
      onError: (err: Error) =>
        logger.error("Failed to cancel subscription:", err),
    });

  const handleCancel = async () => {
    await cancelSubscriptionMutation.mutateAsync({
      cancelImmediately: false,
      reason: cancelReason,
      feedback: "",
    });
    try {
      track("subscription_canceled", {
        cancel_immediately: false,
        reason: cancelReason,
        plan: billingData?.subscription?.plan,
      });
    } catch {
      // non-blocking analytics
    }
  };

  const createBillingPortalMutation =
    trpc.payment.billing.createBillingPortalSession.useMutation({
      onError: (err: Error) => {
        logger.error("Failed to open billing portal:", err);
        toast.error(t("error.failedToOpenBillingPortal"));
      },
    });

  const openBillingPortal = () =>
    createBillingPortalMutation.mutate(undefined, {
      onSuccess: (data: { url: string }) => {
        window.location.href = data.url;
      },
    });

  const formatDate = (value: string | number | undefined | null) => {
    if (value == null) return "—";
    const d =
      typeof value === "number" ? new Date(value * 1000) : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ── Non-admin: read-only plan name, no controls ──
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <SectionHead sub={t("hero.subtitle")} />
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold leading-tight">
              {t("currentPlan.planName", {
                plan: getPlanDisplayName(userPlan),
              })}
            </h3>
            <Badge variant="outline" className="text-xs">
              {t("status.active")}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("currentPlan.activeSubscription")}
          </p>
        </div>
      </div>
    );
  }

  // ── Self-hosted: entitlement is a license key ──
  if (selfHosted) {
    return (
      <div className="space-y-6">
        <SectionHead sub={t("hero.subtitle")} />
        <Link
          to="/settings/license"
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-6 py-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"
              aria-hidden="true"
            >
              <IconKey className="h-4 w-auto shrink-0" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("plansSummary.license")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("plansSummary.manageLicense")}
              </p>
            </div>
          </div>
          <IconChevronRight
            className="h-4 w-auto shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHead sub={t("hero.subtitle")} />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !billingData) {
    return (
      <div className="space-y-6">
        <SectionHead sub={t("hero.subtitle")} />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">{t("errors.loadTitle")}</p>
          <p className="mt-1 text-destructive/80">
            {t("errors.loadDescription")}
          </p>
        </div>
      </div>
    );
  }

  const subscription = billingData.subscription;
  const stripeSub = billingData.stripeSubscription as
    | ExtendedStripeSubscription
    | null
    | undefined;
  const paymentMethod = billingData.paymentMethod as
    | { card?: { last4?: string; brand?: string } | null; last4?: string }
    | null
    | undefined;
  // Stripe nests card details under `.card`; tolerate a flattened shape too.
  const cardLast4 = paymentMethod?.card?.last4 ?? paymentMethod?.last4;
  const plan = subscription?.plan ?? UserPlan.FREE;

  // ── Community / Free: upgrade variant ──
  if (plan === UserPlan.FREE) {
    return (
      <div className="space-y-4">
        <SectionHead sub={t("hero.subtitle")} />
        <div className="rounded-xl border border-border bg-card p-[22px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-heading text-2xl font-semibold">
                {t("community.name")}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t("community.tagline")}
              </p>
            </div>
            <div className="font-heading text-2xl font-semibold">$0</div>
          </div>
          <div className="mt-4">
            <Button asChild>
              <Link to="/plans">
                {t("community.upgrade")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("community.hint")}</p>
      </div>
    );
  }

  const status = subscription?.status;
  const isTrialing = status === "TRIALING";
  const isPastDue = status === "PAST_DUE";
  const isEnterprise = plan === UserPlan.ENTERPRISE;
  const cancelAtPeriodEnd =
    stripeSub?.cancel_at_period_end ||
    (subscription as ExtendedSubscription | undefined)?.cancelAtPeriodEnd ||
    false;

  const priceData = stripeSub?.items?.data?.[0]?.price;
  const unitAmount = priceData?.unit_amount ?? null;
  const intervalKey =
    priceData?.recurring?.interval === "year" ? "yearly" : "monthly";
  const hasPrice = !isEnterprise && unitAmount != null;

  const periodEnd = stripeSub?.current_period_end;
  const trialEnd =
    (subscription as ExtendedSubscription | undefined)?.trialEnd ??
    stripeSub?.trial_end ??
    periodEnd;

  const seats = planData?.usage?.users;
  const showSeats =
    seats != null &&
    typeof seats.limit === "number" &&
    Number.isFinite(seats.limit);

  const hasCard = !!cardLast4;
  const paymentLabel = hasCard
    ? t("hero.updatePayment")
    : t("trial.addPaymentMethod");

  const payments = billingData.recentPayments ?? [];

  return (
    <div className="space-y-4">
      <SectionHead sub={t("hero.subtitle")} />

      {/* Past-due recovery banner */}
      {isPastDue && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="font-medium text-destructive">
            {t("pastDue.title")}
          </span>
          <span className="text-muted-foreground">{t("pastDue.body")}</span>
          <button
            type="button"
            onClick={openBillingPortal}
            className="ml-auto font-medium text-primary hover:underline"
          >
            {t("pastDue.update")}
          </button>
        </div>
      )}

      {/* Plan hero */}
      <div className="rounded-xl border border-border bg-card p-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 font-heading text-2xl font-semibold capitalize">
              {getPlanDisplayName(plan)}
              <StatusPill status={status} />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t(isEnterprise ? "hero.billedContract" : "hero.billedStripe", {
                interval: t(
                  intervalKey === "yearly"
                    ? "hero.intervalYearly"
                    : "hero.intervalMonthly"
                ),
              })}
            </p>
          </div>
          {hasPrice && (
            <div className="text-right">
              <div className="font-heading text-[26px] font-semibold leading-none">
                {formatCurrency(unitAmount)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {intervalKey === "yearly"
                  ? t("hero.perYear")
                  : t("hero.perMonth")}
              </div>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap gap-x-[18px] gap-y-3 border-t border-border pt-4">
          <Kv label={t("hero.interval")}>
            {t(
              intervalKey === "yearly"
                ? "plans.billingToggle.yearly"
                : "plans.billingToggle.monthly"
            )}
          </Kv>
          <Kv label={t("hero.currentPeriodEnds")}>{formatDate(periodEnd)}</Kv>
          <Kv
            label={
              isTrialing
                ? t("trial.endsOn")
                : cancelAtPeriodEnd
                  ? t("hero.cancelsOn")
                  : t("hero.renewsOn")
            }
          >
            {isTrialing
              ? formatDate(trialEnd)
              : cancelAtPeriodEnd
                ? formatDate(periodEnd)
                : `${formatDate(periodEnd)} ${t("hero.auto")}`}
          </Kv>
          {showSeats && (
            <Kv label={t("hero.seats")}>
              {t("hero.seatsValue", {
                current: seats!.current,
                limit: seats!.limit,
              })}
            </Kv>
          )}
          {hasCard && <Kv label={t("hero.paymentMethod")}>•••• {cardLast4}</Kv>}
        </div>

        {/* Actions */}
        <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm">
            <Link to="/plans">{t("hero.changePlan")}</Link>
          </Button>
          {intervalKey === "monthly" && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/plans">
                {t("hero.switchYearly")}
                <span className="ml-1 font-mono text-success">
                  {t("hero.save20")}
                </span>
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={openBillingPortal}>
            {paymentLabel}
          </Button>
          {!cancelAtPeriodEnd && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {t("hero.cancel")}
            </Button>
          )}
        </div>
      </div>

      {/* Trial banner — preserves the E2E-asserted copy + CTA */}
      {isTrialing && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-accent px-5 py-4">
          <Sparkles
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("trial.trialActive")}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {hasCard
                ? t("trial.trialActiveWithPayment", {
                    date: formatDate(trialEnd),
                  })
                : t("trial.addPaymentToKeep", { date: formatDate(trialEnd) })}
            </p>
          </div>
          {!hasCard && (
            <Button size="sm" className="ml-auto" onClick={openBillingPortal}>
              {t("trial.addPaymentMethod")}
            </Button>
          )}
        </div>
      )}

      {/* Invoices */}
      <div className="rounded-xl border border-border bg-card p-[22px]">
        <h3 className="font-heading text-[15px] font-semibold">
          {t("invoices.title")}
        </h3>
        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("invoices.empty")}
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3.5 py-3 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDate(p.createdAt as unknown as string)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatCurrency(p.amount)}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-success">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-success"
                    aria-hidden="true"
                  />
                  {t(`paymentStatus.${p.status}`, { defaultValue: p.status })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={openBillingPortal}
                >
                  {t("invoices.view")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelReason("");
        }}
        tone="danger"
        title={t("cancelDialog.title")}
        warn={{ tone: "warning", message: t("cancelDialog.warn") }}
        body={
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("cancelDialog.reasonLabel")}
            </p>
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("cancelDialog.reasonPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`cancelDialog.reasons.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        confirmLabel={t("cancelDialog.confirm")}
        cancelLabel={t("cancelDialog.keep")}
        isPending={cancelSubscriptionMutation.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
};

function Kv({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-[12.5px]">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export default SubscriptionSection;
