import { useState } from "react";
import { useTranslation } from "react-i18next";

import { trackSignUpClick } from "@/lib/gtm";

type PlanId = "FREE" | "DEVELOPER" | "ENTERPRISE";

const PricingSection = () => {
  const { t: tPricing } = useTranslation("pricing");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [hostingMode, setHostingMode] = useState<"cloud" | "selfhost">("cloud");

  // Self-hosted annual license pricing (preserved).
  const selfHostPricing: Record<
    PlanId,
    { price: string; period?: string; url: string }
  > = {
    FREE: {
      price: "$0",
      url: "https://github.com/getqarote/Qarote",
    },
    DEVELOPER: {
      price: "$348",
      period: "/yr",
      url: `${import.meta.env.VITE_PORTAL_URL}/auth/sign-up`,
    },
    ENTERPRISE: {
      price: "$1,188",
      period: "/yr",
      url: `${import.meta.env.VITE_PORTAL_URL}/auth/sign-up`,
    },
  };

  // Cloud pricing by billing period (preserved values).
  const planPricing = {
    monthly: {
      FREE: { price: "$0", originalPrice: undefined },
      DEVELOPER: { price: "$34", originalPrice: undefined },
      ENTERPRISE: { price: "$124", originalPrice: undefined },
    },
    yearly: {
      FREE: { price: "$0", originalPrice: undefined },
      DEVELOPER: { price: "$29", originalPrice: "$34" },
      ENTERPRISE: { price: "$99", originalPrice: "$124" },
    },
  } as const;

  const startSignUp = (plan: PlanId) => {
    const selfHost = selfHostPricing[plan];
    if (hostingMode === "selfhost" && selfHost.url) {
      window.open(selfHost.url, "_blank");
      return;
    }
    const appBaseUrl = import.meta.env.VITE_APP_BASE_URL;
    const token =
      localStorage.getItem("authToken") ||
      document.cookie.split(";").find((c) => c.trim().startsWith("authToken="));
    if (token) {
      window.location.assign(`${appBaseUrl}/plans`);
    } else {
      trackSignUpClick({ source: "pricing_card", location: "landing_page" });
      window.location.assign(`${appBaseUrl}/auth/sign-up`);
    }
  };

  const plans: {
    id: PlanId;
    name: string;
    description: string;
    bullets: string[];
    popular?: boolean;
    cta: string;
    ctaArrow?: boolean;
    ctaPrimary?: boolean;
    ctaSub?: string;
    isContact?: boolean;
  }[] = [
    {
      id: "FREE",
      name: tPricing("plans.starter.name"),
      description: tPricing("cards.community.description"),
      bullets: [
        tPricing("cards.community.b1"),
        tPricing("cards.community.b2"),
        tPricing("cards.community.b3"),
        tPricing("cards.community.b4"),
        tPricing("cards.community.b5"),
      ],
      cta: tPricing("cta.tryForFree"),
      ctaSub: tPricing("cta.noCreditCard"),
    },
    {
      id: "DEVELOPER",
      name: tPricing("plans.pro.name"),
      description: tPricing("cards.developer.description"),
      bullets: [
        tPricing("cards.developer.b1"),
        tPricing("cards.developer.b2"),
        tPricing("cards.developer.b3"),
        tPricing("cards.developer.b4"),
        tPricing("cards.developer.b5"),
      ],
      popular: true,
      cta: tPricing("cta.tryForFree"),
      ctaArrow: true,
      ctaPrimary: true,
      ctaSub: tPricing("cta.developerTrial"),
    },
    {
      id: "ENTERPRISE",
      name: tPricing("plans.business.name"),
      description: tPricing("cards.enterprise.description"),
      bullets: [
        tPricing("cards.enterprise.b1"),
        tPricing("cards.enterprise.b2"),
        tPricing("cards.enterprise.b3"),
        tPricing("cards.enterprise.b4"),
        tPricing("cards.enterprise.b5"),
      ],
      cta: tPricing("cta.contactSales"),
      isContact: true,
    },
  ];

  return (
    <section id="pricing" className="pt-12 pb-20 bg-background">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,64px)]">
        <div className="mb-12 max-w-[760px]">
          <span className="font-mono text-[12.5px] uppercase tracking-[0.08em] text-primary">
            {tPricing("eyebrow")}
          </span>
          <h2 className="font-display text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] text-foreground mt-2">
            {tPricing("title")}
          </h2>
          <p className="text-[16px] leading-[1.6] text-muted-foreground mt-4">
            {tPricing("subtitle")}
          </p>
        </div>

        {/* Controls: deployment model + billing interval pill groups */}
        <div className="flex flex-col items-center justify-center gap-[14px] mb-10">
          <div
            className="inline-flex gap-1 p-1 border border-border rounded-full bg-secondary"
            role="group"
            aria-label={tPricing("controls.deploymentModel")}
          >
            <button
              type="button"
              onClick={() => setHostingMode("cloud")}
              aria-pressed={hostingMode === "cloud"}
              className={`px-5 py-[9px] rounded-full text-[14px] font-medium transition-colors ${
                hostingMode === "cloud"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tPricing("controls.cloud")}
            </button>
            <button
              type="button"
              onClick={() => setHostingMode("selfhost")}
              aria-pressed={hostingMode === "selfhost"}
              className={`px-5 py-[9px] rounded-full text-[14px] font-medium transition-colors ${
                hostingMode === "selfhost"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tPricing("controls.selfHosted")}
            </button>
          </div>

          <div
            className="inline-flex gap-1 p-1 border border-border rounded-full bg-secondary"
            role="group"
            aria-label={tPricing("controls.billingInterval")}
          >
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              aria-pressed={billingPeriod === "monthly"}
              className={`px-4 py-[7px] rounded-full text-[13.5px] font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tPricing("controls.monthly")}
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod("yearly")}
              aria-pressed={billingPeriod === "yearly"}
              className={`px-4 py-[7px] rounded-full text-[13.5px] font-medium transition-colors ${
                billingPeriod === "yearly"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tPricing("controls.yearly")}
              <span
                className={`font-mono text-[10.5px] ml-[5px] ${
                  billingPeriod === "yearly"
                    ? "text-status-success-text"
                    : "text-muted-foreground"
                }`}
              >
                −20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[22px] items-stretch">
          {plans.map((plan) => {
            const cloud = planPricing[billingPeriod][plan.id];
            const selfHost = selfHostPricing[plan.id];
            const isSelfHost = hostingMode === "selfhost";
            const price = isSelfHost ? selfHost.price : cloud.price;
            const period = isSelfHost
              ? selfHost.period
              : price === "$0"
                ? tPricing("price.free")
                : tPricing("perMonth");
            const sub = isSelfHost
              ? tPricing("sub.selfHosted")
              : plan.id === "FREE"
                ? tPricing("sub.mitForever")
                : plan.id === "ENTERPRISE"
                  ? billingPeriod === "yearly"
                    ? tPricing("sub.billedYearlyPerOrg")
                    : tPricing("sub.billedMonthlyPerOrg")
                  : billingPeriod === "yearly"
                    ? tPricing("sub.billedYearly")
                    : tPricing("sub.billedMonthly");

            return (
              <div
                key={plan.id}
                className={`relative flex h-full flex-col rounded-xl bg-card p-[30px] ${
                  plan.popular
                    ? "border border-primary shadow-[0_24px_50px_-28px_rgba(232,89,12,0.4)]"
                    : "border border-border"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-[11px] left-[30px] font-mono text-[11px] tracking-[0.06em] uppercase bg-primary text-primary-foreground px-[11px] py-1 rounded-full">
                    {tPricing("mostPopular")}
                  </span>
                )}

                <div className="font-display text-[21px] font-semibold text-foreground">
                  {plan.name}
                </div>
                <p className="text-muted-foreground text-[14px] mt-[6px] min-h-[40px]">
                  {plan.description}
                </p>

                <div className="mt-[20px] mb-1 flex items-baseline gap-[6px]">
                  <span className="font-display text-[40px] font-semibold tracking-[-0.02em] text-foreground">
                    {price}
                  </span>
                  {period && (
                    <span className="text-muted-foreground text-[14px]">
                      {period}
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11.5px] text-muted-foreground min-h-[18px]">
                  {sub}
                </div>

                <ul className="list-none my-[22px] flex flex-col gap-[11px] flex-1">
                  {plan.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="text-[14.5px] text-muted-foreground flex gap-[10px] items-start"
                    >
                      <span
                        className="text-primary shrink-0 mt-[2px]"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => {
                    if (plan.isContact) {
                      window.location.assign("#contact-sales");
                      return;
                    }
                    startSignUp(plan.id);
                  }}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-7 py-3 text-[15px] font-medium transition-colors ${
                    plan.ctaPrimary
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                  {plan.ctaArrow && <span aria-hidden="true">→</span>}
                </button>
                {plan.ctaSub && (
                  <div className="font-mono text-center text-[11.5px] text-muted-foreground mt-[10px]">
                    {plan.ctaSub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
