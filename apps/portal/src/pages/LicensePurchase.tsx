import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { CreditCard, Lock, Minus, Plus } from "lucide-react";

import { track } from "@/lib/analytics";
import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Plan = {
  tier: "DEVELOPER" | "ENTERPRISE";
  name: string;
  annualPrice: string;
  unitPrice: number;
  audience: string;
  /** The "most popular" marketing highlight (carrot border + badge). */
  popular: boolean;
  /** Concise feature bullets, mirroring the marketing pricing cards. */
  bullets: string[];
};

const LicensePurchase = () => {
  const [selectedTier, setSelectedTier] = useState<"DEVELOPER" | "ENTERPRISE">(
    "DEVELOPER"
  );
  const [seats, setSeats] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const { t } = useTranslation("portal");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptIdRef = useRef(0);

  const purchaseLicenseMutation = trpc.license.purchaseLicense.useMutation();

  useEffect(() => {
    try {
      track("purchase_page_viewed");
    } catch {
      // non-blocking analytics
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      attemptIdRef.current++;
    };
  }, []);

  const handleTierSelect = useCallback((tier: "DEVELOPER" | "ENTERPRISE") => {
    setSelectedTier(tier);
    try {
      track("license_plan_selected", { tier });
    } catch {
      // non-blocking analytics
    }
  }, []);

  const handlePurchase = useCallback(() => {
    setPurchaseError(null);
    setIsLoading(true);
    try {
      track("license_purchase_initiated", { tier: selectedTier });
    } catch {
      // non-blocking analytics
    }

    // Clear any stale timer from a previous attempt so it can't
    // fire and invalidate the new one.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const myAttempt = ++attemptIdRef.current;

    timeoutRef.current = setTimeout(() => {
      attemptIdRef.current++;
      setIsLoading(false);
      setPurchaseError(t("licensePurchase.purchaseFailed"));
      try {
        track("license_purchase_failed", {
          tier: selectedTier,
          reason: "timeout",
        });
      } catch {
        // non-blocking analytics
      }
    }, 30000);

    purchaseLicenseMutation.mutate(
      { tier: selectedTier },
      {
        onSuccess: (data) => {
          if (attemptIdRef.current !== myAttempt) return;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          window.location.href = data.checkoutUrl;
        },
        onError: (error) => {
          if (attemptIdRef.current !== myAttempt) return;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setPurchaseError(
            error.message || t("licensePurchase.purchaseFailed")
          );
          try {
            track("license_purchase_failed", {
              tier: selectedTier,
              reason: "api_error",
            });
          } catch {
            // non-blocking analytics
          }
          setIsLoading(false);
        },
      }
    );
  }, [selectedTier, purchaseLicenseMutation, t]);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, tier: "DEVELOPER" | "ENTERPRISE") => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleTierSelect(tier);
      }
    },
    [handleTierSelect]
  );

  // Concise feature bullets per tier — mirrors the marketing pricing cards.
  const bulletsFor = useCallback(
    (key: "developer" | "enterprise"): string[] => {
      const raw = t(`licensePurchase.cards.${key}.bullets`, {
        returnObjects: true,
      });
      return Array.isArray(raw) ? (raw as string[]) : [];
    },
    [t]
  );

  const plans = useMemo(
    (): Plan[] => [
      {
        tier: "DEVELOPER",
        name: t("licensePurchase.plans.developer.name"),
        annualPrice: "$348",
        unitPrice: 348,
        audience: t("licensePurchase.plans.developer.audience"),
        popular: true,
        bullets: bulletsFor("developer"),
      },
      {
        tier: "ENTERPRISE",
        name: t("licensePurchase.plans.enterprise.name"),
        annualPrice: "$1,188",
        unitPrice: 1188,
        audience: t("licensePurchase.plans.enterprise.audience"),
        popular: false,
        bullets: bulletsFor("enterprise"),
      },
    ],
    [t, bulletsFor]
  );

  const selectedPlan = plans.find((p) => p.tier === selectedTier)!;
  const total = selectedPlan.unitPrice * seats;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="title-page">{t("licensePurchase.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("licensePurchase.intro")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div
          role="radiogroup"
          aria-label={t("licensePurchase.tierGroupLabel")}
          className="grid gap-6 md:grid-cols-2"
        >
          {plans.map((plan) => {
            const isSelected = selectedTier === plan.tier;
            return (
              <div
                key={plan.tier}
                role="radio"
                tabIndex={0}
                aria-checked={isSelected}
                onClick={() => handleTierSelect(plan.tier)}
                onKeyDown={(e) => handleCardKeyDown(e, plan.tier)}
                className={`relative flex h-full cursor-pointer flex-col rounded-xl bg-card p-[30px] transition-all ${
                  plan.popular
                    ? "border border-primary shadow-[0_24px_50px_-28px_rgba(232,89,12,0.4)]"
                    : "border border-border"
                } ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : ""
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-[11px] left-[30px] rounded-full bg-primary px-[11px] py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-primary-foreground">
                    {t("licensePurchase.badges.mostPopular")}
                  </span>
                )}

                <div className="font-display text-[21px] font-semibold text-foreground">
                  {plan.name}
                </div>
                <p className="mt-[6px] min-h-[40px] text-[14px] text-muted-foreground">
                  {plan.audience}
                </p>

                <div className="mb-1 mt-[20px] flex items-baseline gap-[6px]">
                  <span className="font-display text-[40px] font-semibold tracking-[-0.02em] text-foreground">
                    {plan.annualPrice}
                  </span>
                  <span className="text-[14px] text-muted-foreground">
                    {t("licensePurchase.perYear")}
                  </span>
                </div>

                <ul className="my-[22px] flex flex-1 list-none flex-col gap-[11px]">
                  {plan.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-[10px] text-[14.5px] text-muted-foreground"
                    >
                      <span
                        className="mt-[2px] shrink-0 text-primary"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <Card className="lg:sticky lg:top-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {t("licensePurchase.orderSummary.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("licensePurchase.orderSummary.tierLine", {
                  name: selectedPlan.name,
                })}
              </span>
              <span className="font-mono font-medium">
                {selectedPlan.annualPrice}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("licensePurchase.orderSummary.seats")}
              </span>
              <span className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSeats((q) => Math.max(1, q - 1))}
                  disabled={seats <= 1}
                  aria-label={t("licensePurchase.orderSummary.decreaseSeats")}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <span
                  className="w-8 text-center font-mono tabular-nums"
                  aria-live="polite"
                >
                  {seats}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSeats((q) => q + 1)}
                  aria-label={t("licensePurchase.orderSummary.increaseSeats")}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </span>
            </div>

            <hr className="border-border" />

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">
                {t("licensePurchase.orderSummary.total")}
              </span>
              <span className="font-mono text-lg font-bold">
                ${total.toLocaleString()}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                  {t("licensePurchase.perYear")}
                </span>
              </span>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={isLoading}
              className="w-full"
            >
              <CreditCard aria-hidden="true" />
              {isLoading
                ? t("licensePurchase.redirectingToStripe")
                : t("licensePurchase.orderSummary.checkout")}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
              {t("licensePurchase.orderSummary.secureCheckout")}
            </p>

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to="/licenses">
                {t("licensePurchase.orderSummary.cancel")}
              </Link>
            </Button>

            {purchaseError && (
              <p className="text-center text-sm text-destructive">
                {purchaseError}{" "}
                <button
                  type="button"
                  onClick={handlePurchase}
                  className="underline hover:no-underline"
                >
                  {t("licensePurchase.tryAgain")}
                </button>{" "}
                {t("licensePurchase.or")}{" "}
                <a
                  href="mailto:contact@qarote.io"
                  className="underline hover:no-underline"
                >
                  {t("licensePurchase.contactSupport")}
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("licensePurchase.enterpriseContact")}{" "}
        <a
          href="mailto:contact@qarote.io"
          className="underline hover:no-underline"
        >
          contact@qarote.io
        </a>
      </p>
    </div>
  );
};

export default LicensePurchase;
