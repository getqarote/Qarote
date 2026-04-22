import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PixelCheck } from "@/components/ui/pixel-check";

type FeatureItem = {
  label: string;
  value?: string;
  soon?: boolean;
};

type FeatureCategory = {
  label: string;
  items: FeatureItem[];
};

type Plan = {
  tier: "DEVELOPER" | "ENTERPRISE";
  name: string;
  annualPrice: string;
  categories: FeatureCategory[];
};

const LicensePurchase = () => {
  const [selectedTier, setSelectedTier] = useState<"DEVELOPER" | "ENTERPRISE">(
    "DEVELOPER"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const { t } = useTranslation("portal");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const purchaseLicenseMutation = trpc.license.purchaseLicense.useMutation({
    onSuccess: (data) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPurchaseError(error.message || t("licensePurchase.purchaseFailed"));
      setIsLoading(false);
    },
  });

  const handlePurchase = useCallback(() => {
    setPurchaseError(null);
    setIsLoading(true);

    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setPurchaseError(t("licensePurchase.purchaseFailed"));
    }, 30000);

    purchaseLicenseMutation.mutate({ tier: selectedTier });
  }, [selectedTier, purchaseLicenseMutation, t]);

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent, tier: "DEVELOPER" | "ENTERPRISE") => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedTier(tier);
      }
    },
    []
  );

  const sharedCoreFeatures = useCallback(
    (limit: string): FeatureItem[] => [
      { label: t("licensePurchase.features.servers"), value: limit },
      { label: t("licensePurchase.features.workspaces"), value: limit },
      { label: t("licensePurchase.features.teamMembers"), value: limit },
      { label: t("licensePurchase.features.advancedAnalytics") },
      { label: t("licensePurchase.features.queueManagement") },
      { label: t("licensePurchase.features.alertsWebhooks") },
      { label: t("licensePurchase.features.topologyVisualization") },
      { label: t("licensePurchase.features.roleBasedAccess"), soon: true },
    ],
    [t]
  );

  const sharedSecurityBase = useMemo(
    (): FeatureItem[] => [
      {
        label: t("licensePurchase.features.rabbitmqVersions"),
        value: t("licensePurchase.limits.rabbitmqVersionsValue"),
      },
      { label: t("licensePurchase.features.soc2") },
    ],
    [t]
  );

  const sharedSupportFeatures = useMemo(
    (): FeatureItem[] => [
      { label: t("licensePurchase.features.communitySupport") },
      { label: t("licensePurchase.features.prioritySupport") },
    ],
    [t]
  );

  const plans = useMemo(
    (): Plan[] => [
      {
        tier: "DEVELOPER",
        name: t("licensePurchase.plans.developer.name"),
        annualPrice: "$348",
        categories: [
          {
            label: t("licensePurchase.categories.coreFeatures"),
            items: sharedCoreFeatures(t("licensePurchase.limits.upTo3")),
          },
          {
            label: t("licensePurchase.categories.security"),
            items: sharedSecurityBase,
          },
          {
            label: t("licensePurchase.categories.support"),
            items: sharedSupportFeatures,
          },
        ],
      },
      {
        tier: "ENTERPRISE",
        name: t("licensePurchase.plans.enterprise.name"),
        annualPrice: "$1,188",
        categories: [
          {
            label: t("licensePurchase.categories.coreFeatures"),
            items: sharedCoreFeatures(t("licensePurchase.limits.unlimited")),
          },
          {
            label: t("licensePurchase.categories.security"),
            items: [
              { label: t("licensePurchase.features.ssoSamlOidc") },
              ...sharedSecurityBase,
            ],
          },
          {
            label: t("licensePurchase.categories.support"),
            items: sharedSupportFeatures,
          },
        ],
      },
    ],
    [t, sharedCoreFeatures, sharedSecurityBase, sharedSupportFeatures]
  );

  const selectedPlan = plans.find((p) => p.tier === selectedTier)!;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="title-page">{t("licensePurchase.title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("licensePurchase.annualLicensing")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isSelected = selectedTier === plan.tier;
          return (
            <Card
              key={plan.tier}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={`cursor-pointer transition-all flex flex-col ${
                isSelected ? "license-card-selected" : "license-card-hover"
              }`}
              onClick={() => setSelectedTier(plan.tier)}
              onKeyDown={(e) => handleCardKeyDown(e, plan.tier)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {isSelected && (
                    <span className="text-xs font-medium text-success border border-success/40 rounded px-2 py-0.5 shrink-0">
                      {t("licensePurchase.badges.selected")}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold">
                    {plan.annualPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("licensePurchase.perYear")}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 flex-1">
                <hr className="border-border" />
                {plan.categories.map((category) => (
                  <div key={category.label}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {category.label}
                    </p>
                    <ul className="space-y-2.5">
                      {category.items.map((item) => (
                        <li key={item.label} className="flex items-start gap-3">
                          <div className="mt-1.5 w-3.5 shrink-0 flex items-start">
                            <PixelCheck className="h-[0.7rem] w-auto shrink-0 text-success" />
                          </div>
                          <span className="text-sm leading-snug">
                            <span className="font-medium">{item.label}</span>
                            {item.soon && (
                              <span className="ml-1.5 text-xs border border-border rounded px-1 py-px text-muted-foreground">
                                {t("licensePurchase.badges.soon")}
                              </span>
                            )}
                            {item.value && (
                              <span className="block text-muted-foreground text-xs mt-0.5">
                                {item.value}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={handlePurchase}
          disabled={isLoading}
          size="lg"
          className="px-8"
        >
          {isLoading
            ? t("licensePurchase.redirectingToStripe")
            : t("licensePurchase.purchasePlanLabel", {
                name: selectedPlan.name,
                price: selectedPlan.annualPrice,
              })}
        </Button>

        {purchaseError ? (
          <p className="text-sm text-destructive text-center">
            {purchaseError}{" "}
            <button
              onClick={handlePurchase}
              className="underline hover:no-underline"
            >
              {t("licensePurchase.tryAgain")}
            </button>{" "}
            {t("licensePurchase.or")}{" "}
            <a
              href="mailto:hello@qarote.io"
              className="underline hover:no-underline"
            >
              {t("licensePurchase.contactSupport")}
            </a>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("licensePurchase.stripeHandoff")}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {t("licensePurchase.enterpriseContact")}{" "}
          <a
            href="mailto:hello@qarote.io"
            className="underline hover:no-underline"
          >
            hello@qarote.io
          </a>
        </p>
      </div>
    </div>
  );
};

export default LicensePurchase;
