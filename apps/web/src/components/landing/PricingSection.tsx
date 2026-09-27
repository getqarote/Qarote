import { useState } from "react";
import { useTranslation } from "react-i18next";

import { trackSignUpClick } from "@/lib/gtm";

type BillingPeriod = "monthly" | "yearly";

/**
 * The single cloud plan, by billing period. The yearly price is what the
 * card leads with; the monthly figure is the strike-through anchor.
 */
const PRICING: Record<
  BillingPeriod,
  { price: string; originalPrice?: string; yearlyTotal?: string }
> = {
  monthly: { price: "$124" },
  yearly: { price: "$99", originalPrice: "$124", yearlyTotal: "$1,188" },
};

/**
 * Brokers above the queue ceiling are a conversation, not a checkout: open
 * the chat widget when it is mounted (cloud mode + consent), else fall back
 * to email. Mirrors HelpSupport in the app: the Tawk stub object exists before
 * the script is ready, so a click during load defers to onLoad.
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

const PricingSection = () => {
  const { t: tPricing } = useTranslation("pricing");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");
  const pricing = PRICING[billingPeriod];

  // Every click goes to sign-up, which grants the 14-day trial. The app
  // itself decides what an already signed-in visitor sees there.
  const startSignUp = () => {
    trackSignUpClick({ source: "pricing_card", location: "landing_page" });
    window.location.assign(`${import.meta.env.VITE_APP_BASE_URL}/auth/sign-up`);
  };

  const bullets = [
    tPricing("cards.cloud.b1"),
    tPricing("cards.cloud.b2"),
    tPricing("cards.cloud.b3"),
    tPricing("cards.cloud.b4"),
    tPricing("cards.cloud.b5"),
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

        {/* Billing interval pill group */}
        <div className="flex items-center justify-center mb-10">
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

        {/* The plan */}
        <div className="mx-auto max-w-[520px]">
          <div className="relative flex flex-col rounded-xl bg-card p-[30px] border border-primary shadow-[0_24px_50px_-28px_rgba(232,89,12,0.4)]">
            <div className="font-display text-[21px] font-semibold text-foreground">
              {tPricing("plans.cloud.name")}
            </div>
            <p className="text-muted-foreground text-[14px] mt-[6px]">
              {tPricing("plans.cloud.description")}
            </p>

            <div className="mt-[20px] mb-1 flex items-baseline gap-[6px]">
              <span className="font-display text-[40px] font-semibold tracking-[-0.02em] text-foreground">
                {pricing.price}
              </span>
              <span className="text-muted-foreground text-[14px]">
                {tPricing("perMonth")}
              </span>
              {pricing.originalPrice && (
                <span className="text-muted-foreground text-[14px] line-through ml-[4px]">
                  {pricing.originalPrice}
                </span>
              )}
            </div>
            <div className="font-mono text-[11.5px] text-muted-foreground min-h-[18px]">
              {billingPeriod === "yearly"
                ? `${pricing.yearlyTotal}${tPricing("perYear")} · ${tPricing("sub.billedYearlyPerOrg")}`
                : tPricing("sub.billedMonthlyPerOrg")}
            </div>

            <ul className="list-none mt-[22px] mb-[10px] flex flex-col gap-[11px]">
              {bullets.map((bullet) => (
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
            <p className="font-mono text-[11.5px] text-muted-foreground mb-[18px]">
              {tPricing("cards.cloud.limit")}
            </p>

            <button
              type="button"
              onClick={startSignUp}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md px-7 py-3 text-[15px] font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {tPricing("cta.startTrial")}
              <span aria-hidden="true">→</span>
            </button>
            <div className="font-mono text-center text-[11.5px] text-muted-foreground mt-[10px]">
              {tPricing("cta.freeTrial")} · {tPricing("cta.noCreditCard")}
            </div>
          </div>

          <p className="text-center text-[14px] text-muted-foreground mt-6">
            {tPricing("cta.moreQueues")}{" "}
            <button
              type="button"
              onClick={openContact}
              className="text-foreground underline underline-offset-4 hover:text-primary"
            >
              {tPricing("cta.contactUs")}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
