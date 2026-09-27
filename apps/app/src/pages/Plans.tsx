import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ArrowRight } from "lucide-react";

import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { IconCheck, IconChevronLeft } from "@/components/ui/icons";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

type BillingPeriod = "monthly" | "yearly";

/** The single cloud plan, by billing period — mirrors the marketing landing. */
const PRICING: Record<
  BillingPeriod,
  { price: string; originalPrice?: string; yearlyTotal?: string }
> = {
  monthly: { price: "$124" },
  yearly: { price: "$99", originalPrice: "$124", yearlyTotal: "$1,188" },
};

/**
 * Brokers above the queue ceiling are a conversation, not a checkout: drive
 * the globally mounted Tawk.to widget (same handling as HelpSupport — the stub
 * object exists before the script is ready, so a click during load defers to
 * onLoad), else fall back to email for self-hosted installs where the widget
 * never loads.
 */
const openContact = () => {
  const api = window.Tawk_API;
  if (!api) {
    window.location.href = "mailto:support@qarote.io";
    return;
  }
  if (typeof api.maximize === "function") {
    api.maximize();
  } else {
    // Widget script present but not ready yet — maximize once it loads.
    api.onLoad = () => window.Tawk_API?.maximize?.();
  }
};

const BULLET_KEYS = [
  "cards.cloud.b1",
  "cards.cloud.b2",
  "cards.cloud.b3",
  "cards.cloud.b4",
  "cards.cloud.b5",
] as const;

/**
 * In-app pricing page. Renders the same single-plan card as the marketing
 * landing (`apps/web` PricingSection) — billing pill toggle, description, and
 * five concise bullets — so the surfaces read as one product. The CTA is wired
 * to the authenticated Stripe checkout rather than the landing's sign-up
 * redirect. That checkout collects a card and starts billing (the 14-day trial
 * is granted at sign-up, not here), so this page promises no trial.
 */
const Plans = () => {
  const { t } = useTranslation("pricing");
  const { t: tBilling } = useTranslation("billing");
  const navigate = useNavigate();
  const { userPlan } = useUser();
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");
  const pricing = PRICING[billingPeriod];
  const isCurrentPlan = userPlan === UserPlan.ENTERPRISE;

  const handleCta = () => {
    if (isCurrentPlan) return;
    track("plan_upgrade_initiated", {
      plan: UserPlan.ENTERPRISE,
      billing_interval: billingPeriod,
      current_plan: userPlan,
    });
    handleUpgrade(UserPlan.ENTERPRISE, billingPeriod);
  };

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/settings/subscription")}
                  aria-label={tBilling("plans.backToPlans")}
                  title={tBilling("plans.backToPlans")}
                >
                  <IconChevronLeft
                    className="h-4 w-auto shrink-0"
                    aria-hidden="true"
                  />
                </Button>
                <div>
                  <h1 className="title-page">
                    {tBilling("plans.chooseYourPlan")}
                  </h1>
                  <p className="text-muted-foreground">
                    {tBilling("plans.subtitle")}
                  </p>
                </div>
              </div>
            </div>

            {/* Billing interval pill group */}
            <div className="flex items-center justify-center mb-10">
              <div
                className="inline-flex gap-1 p-1 border border-border rounded-full bg-secondary"
                role="group"
                aria-label={t("controls.billingInterval")}
              >
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  aria-pressed={billingPeriod === "monthly"}
                  className={cn(
                    "px-4 py-[7px] rounded-full text-[13.5px] font-medium transition-colors",
                    billingPeriod === "monthly"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("controls.monthly")}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod("yearly")}
                  aria-pressed={billingPeriod === "yearly"}
                  className={cn(
                    "px-4 py-[7px] rounded-full text-[13.5px] font-medium transition-colors",
                    billingPeriod === "yearly"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("controls.yearly")}
                  <span
                    className={cn(
                      "font-mono text-[10.5px] ml-[5px]",
                      billingPeriod === "yearly"
                        ? "text-success"
                        : "text-muted-foreground"
                    )}
                  >
                    −20%
                  </span>
                </button>
              </div>
            </div>

            {/* The plan */}
            <div className="mx-auto max-w-[520px]">
              <div className="relative flex flex-col rounded-xl bg-card p-8 border border-primary shadow-[0_24px_50px_-28px_rgba(232,89,12,0.4)]">
                {isCurrentPlan && (
                  <span className="absolute top-4 right-4 rounded border border-primary px-2 py-0.5 text-xs font-medium text-primary">
                    {t("currentPlan")}
                  </span>
                )}

                <h3 className="text-2xl font-semibold text-foreground">
                  {t("plans.cloud.name")}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("plans.cloud.description")}
                </p>

                <div className="mt-5 mb-1 flex items-baseline gap-1.5">
                  <span className="text-5xl font-medium text-foreground font-mono tabular-nums">
                    {pricing.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("perMonth")}
                  </span>
                  {pricing.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through ml-1">
                      {pricing.originalPrice}
                    </span>
                  )}
                </div>
                <div className="min-h-[18px] font-mono text-[11.5px] text-muted-foreground">
                  {billingPeriod === "yearly"
                    ? `${pricing.yearlyTotal}${t("perYear")} · ${t("sub.billedYearlyPerOrg")}`
                    : t("sub.billedMonthlyPerOrg")}
                </div>

                <ul className="mt-6 mb-2 flex list-none flex-col gap-3">
                  {BULLET_KEYS.map((key) => (
                    <li
                      key={key}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <IconCheck
                        className="mt-1 h-[0.7rem] w-auto shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {t(key)}
                    </li>
                  ))}
                </ul>
                <p className="mb-4 font-mono text-[11.5px] text-muted-foreground">
                  {t("cards.cloud.limit")}
                </p>

                <Button
                  onClick={handleCta}
                  variant={isCurrentPlan ? "outline" : "default"}
                  className="w-full rounded-md px-7 py-3 text-base h-auto"
                  disabled={isCurrentPlan || isUpgrading}
                >
                  {isCurrentPlan ? t("currentPlan") : t("cta.subscribe")}
                  {!isCurrentPlan && (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {t("cta.moreQueues")}{" "}
                <button
                  type="button"
                  onClick={openContact}
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {t("cta.contactUs")}
                </button>
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Plans;
