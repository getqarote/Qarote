import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ArrowRight } from "lucide-react";

import { track } from "@/lib/analytics";
import { openPortalPath } from "@/lib/runtimeConfig";
import { cn } from "@/lib/utils";

import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { IconCheck, IconChevronLeft } from "@/components/ui/icons";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

type PlanId = "FREE" | "DEVELOPER" | "ENTERPRISE";
type BillingPeriod = "monthly" | "yearly";
type HostingMode = "cloud" | "selfhost";

const GITHUB_URL = "https://github.com/getqarote/Qarote";

/** Cloud subscription pricing by billing period — mirrors the marketing landing. */
const CLOUD_PRICING: Record<
  BillingPeriod,
  Record<PlanId, { price: string; originalPrice?: string }>
> = {
  monthly: {
    FREE: { price: "$0" },
    DEVELOPER: { price: "$34" },
    ENTERPRISE: { price: "$124" },
  },
  yearly: {
    FREE: { price: "$0" },
    DEVELOPER: { price: "$29", originalPrice: "$34" },
    ENTERPRISE: { price: "$99", originalPrice: "$124" },
  },
};

/** Self-hosted annual license pricing — mirrors the marketing landing. */
const SELF_HOST_PRICING: Record<PlanId, { price: string; period?: string }> = {
  FREE: { price: "$0" },
  DEVELOPER: { price: "$348", period: "/yr" },
  ENTERPRISE: { price: "$1,188", period: "/yr" },
};

interface PlanDef {
  id: PlanId;
  nameKey: string;
  descKey: string;
  bulletKeys: string[];
  popular?: boolean;
  ctaArrow?: boolean;
  ctaPrimary?: boolean;
  ctaSubKey?: string;
}

const PLAN_DEFS: PlanDef[] = [
  {
    id: "FREE",
    nameKey: "plans.starter.name",
    descKey: "cards.community.description",
    bulletKeys: [
      "cards.community.b1",
      "cards.community.b2",
      "cards.community.b3",
      "cards.community.b4",
      "cards.community.b5",
    ],
    ctaSubKey: "cta.noCreditCard",
  },
  {
    id: "DEVELOPER",
    nameKey: "plans.pro.name",
    descKey: "cards.developer.description",
    bulletKeys: [
      "cards.developer.b1",
      "cards.developer.b2",
      "cards.developer.b3",
      "cards.developer.b4",
      "cards.developer.b5",
    ],
    popular: true,
    ctaArrow: true,
    ctaPrimary: true,
    ctaSubKey: "cta.developerTrial",
  },
  {
    id: "ENTERPRISE",
    nameKey: "plans.business.name",
    descKey: "cards.enterprise.description",
    bulletKeys: [
      "cards.enterprise.b1",
      "cards.enterprise.b2",
      "cards.enterprise.b3",
      "cards.enterprise.b4",
      "cards.enterprise.b5",
    ],
  },
];

/**
 * In-app pricing page. Renders the same curated three-plan layout as the
 * marketing landing (`apps/web` PricingSection) — deployment + billing pill
 * toggles, per-plan description, and five concise bullets — so the surfaces
 * read as one product. CTAs are wired to the authenticated upgrade flow
 * (Stripe checkout for cloud) rather than the landing's sign-up redirect.
 */
const Plans = () => {
  const { t } = useTranslation("pricing");
  const { t: tBilling } = useTranslation("billing");
  const navigate = useNavigate();
  const { userPlan } = useUser();
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();

  const [hostingMode, setHostingMode] = useState<HostingMode>("cloud");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");

  const isCurrent = (id: PlanId) => id === userPlan?.toUpperCase();

  const handleCta = (id: PlanId) => {
    if (hostingMode === "selfhost") {
      if (id === "FREE") {
        window.open(GITHUB_URL, "_blank", "noopener,noreferrer");
        return;
      }
      openPortalPath("/auth/sign-up");
      return;
    }
    if (isCurrent(id)) return;
    track("plan_upgrade_initiated", {
      plan: id,
      billing_interval: billingPeriod,
      current_plan: userPlan,
    });
    handleUpgrade(id as UserPlan, billingPeriod);
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

            {/* Controls: deployment model + billing interval pill groups */}
            <div className="flex flex-col items-center justify-center gap-[14px] mb-10">
              <div
                className="inline-flex gap-1 p-1 border border-border rounded-full bg-secondary"
                role="group"
                aria-label={t("controls.deploymentModel")}
              >
                {(["cloud", "selfhost"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setHostingMode(mode)}
                    aria-pressed={hostingMode === mode}
                    className={cn(
                      "px-5 py-[9px] rounded-full text-[14px] font-medium transition-colors",
                      hostingMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(
                      mode === "cloud"
                        ? "controls.cloud"
                        : "controls.selfHosted"
                    )}
                  </button>
                ))}
              </div>

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

            {/* Plans grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-7xl mx-auto">
              {PLAN_DEFS.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  hostingMode={hostingMode}
                  billingPeriod={billingPeriod}
                  isCurrentPlan={hostingMode === "cloud" && isCurrent(plan.id)}
                  isUpgrading={isUpgrading}
                  onCta={() => handleCta(plan.id)}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

interface PlanCardProps {
  plan: PlanDef;
  hostingMode: HostingMode;
  billingPeriod: BillingPeriod;
  isCurrentPlan: boolean;
  isUpgrading: boolean;
  onCta: () => void;
}

function PlanCard({
  plan,
  hostingMode,
  billingPeriod,
  isCurrentPlan,
  isUpgrading,
  onCta,
}: PlanCardProps) {
  const { t } = useTranslation("pricing");

  const isSelfHost = hostingMode === "selfhost";
  const cloud = CLOUD_PRICING[billingPeriod][plan.id];
  const selfHost = SELF_HOST_PRICING[plan.id];

  const price = isSelfHost ? selfHost.price : cloud.price;
  const period = isSelfHost
    ? selfHost.period
    : price === "$0"
      ? t("price.free")
      : t("perMonth");
  const sub = isSelfHost
    ? t("sub.selfHosted")
    : plan.id === "FREE"
      ? t("sub.mitForever")
      : plan.id === "ENTERPRISE"
        ? billingPeriod === "yearly"
          ? t("sub.billedYearlyPerOrg")
          : t("sub.billedMonthlyPerOrg")
        : billingPeriod === "yearly"
          ? t("sub.billedYearly")
          : t("sub.billedMonthly");

  const ctaLabel = isCurrentPlan ? t("currentPlan") : t("cta.tryForFree");

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-xl bg-card p-8",
        plan.popular
          ? "border border-primary shadow-[0_24px_50px_-28px_rgba(232,89,12,0.4)]"
          : "border border-border"
      )}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-8 font-mono text-[11px] font-medium uppercase tracking-[0.06em] px-3 py-1 rounded-full bg-primary text-primary-foreground">
          {t("mostPopular")}
        </span>
      )}
      {isCurrentPlan && (
        <span className="absolute top-4 right-4 rounded border border-primary px-2 py-0.5 text-xs font-medium text-primary">
          {t("currentPlan")}
        </span>
      )}

      <h3 className="text-2xl font-semibold text-foreground">
        {t(plan.nameKey)}
      </h3>
      <p className="mt-1.5 min-h-[40px] text-sm text-muted-foreground">
        {t(plan.descKey)}
      </p>

      <div className="mt-5 mb-1 flex items-baseline gap-1.5">
        <span className="text-5xl font-medium text-foreground font-mono tabular-nums">
          {price}
        </span>
        {period && (
          <span className="text-sm text-muted-foreground">{period}</span>
        )}
      </div>
      <div className="min-h-[18px] font-mono text-[11.5px] text-muted-foreground">
        {sub}
      </div>

      <ul className="my-6 flex flex-1 list-none flex-col gap-3">
        {plan.bulletKeys.map((key) => (
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

      <Button
        onClick={onCta}
        variant={plan.ctaPrimary && !isCurrentPlan ? "default" : "outline"}
        className="w-full rounded-md px-7 py-3 text-base h-auto"
        disabled={isCurrentPlan || isUpgrading}
      >
        {ctaLabel}
        {plan.ctaArrow && !isCurrentPlan && (
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
      {plan.ctaSubKey && (
        <div className="mt-2.5 text-center font-mono text-[11.5px] text-muted-foreground">
          {t(plan.ctaSubKey)}
        </div>
      )}
    </div>
  );
}

export default Plans;
