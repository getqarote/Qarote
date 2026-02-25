import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Check } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LicensePurchase = () => {
  const [selectedTier, setSelectedTier] = useState<"DEVELOPER" | "ENTERPRISE">(
    "DEVELOPER"
  );
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation("portal");

  const purchaseLicenseMutation = trpc.license.purchaseLicense.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      toast.error(error.message || t("licensePurchase.purchaseFailed"));
      setIsLoading(false);
    },
  });

  const handlePurchase = async () => {
    setIsLoading(true);

    try {
      purchaseLicenseMutation.mutate({
        tier: selectedTier,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("licensePurchase.purchaseFailed")
      );
      setIsLoading(false);
    }
  };

  const plans = [
    {
      tier: "DEVELOPER" as const,
      name: t("licensePurchase.plans.developer.name"),
      annualPrice: "$348",
      features: [
        t("licensePurchase.plans.developer.features.servers"),
        t("licensePurchase.plans.developer.features.queueManagement"),
        t("licensePurchase.plans.developer.features.basicAlerts"),
        t("licensePurchase.plans.developer.features.emailSupport"),
      ],
    },
    {
      tier: "ENTERPRISE" as const,
      name: t("licensePurchase.plans.enterprise.name"),
      annualPrice: "$1,188",
      features: [
        t("licensePurchase.plans.enterprise.features.unlimitedServers"),
        t("licensePurchase.plans.enterprise.features.advancedMonitoring"),
        t("licensePurchase.plans.enterprise.features.prioritySupport"),
        t("licensePurchase.plans.enterprise.features.customIntegrations"),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("licensePurchase.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("licensePurchase.description")}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("licensePurchase.annualLicensing")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.tier}
            className={`cursor-pointer transition-all ${
              selectedTier === plan.tier
                ? "license-card-selected"
                : "license-card-hover"
            }`}
            onClick={() => setSelectedTier(plan.tier)}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold">{plan.annualPrice}</span>
                <span className="text-sm text-muted-foreground">
                  {t("licensePurchase.perYear")}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-sm">
                    <Check className="h-4 w-4 mr-2 icon-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handlePurchase}
          disabled={isLoading}
          size="lg"
          className="px-8"
        >
          {isLoading
            ? t("licensePurchase.processing")
            : t("licensePurchase.purchaseLicense")}
        </Button>
      </div>
    </div>
  );
};

export default LicensePurchase;
