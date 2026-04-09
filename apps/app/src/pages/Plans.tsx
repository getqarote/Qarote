import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

import { AppSidebar } from "@/components/AppSidebar";
import { PlanBillingToggle } from "@/components/plans/PlanBillingToggle";
import { PlanCard } from "@/components/plans/PlanCard";
import {
  type ApiPlan,
  type BillingInterval,
  getPlanPricing,
} from "@/components/plans/planHelpers";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { useAllPlans } from "@/hooks/queries/usePlans";
import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

interface PlansPageProps {
  onUpgrade: (plan: UserPlan, billingInterval: BillingInterval) => void;
  isUpgrading?: boolean;
}

/**
 * Pricing page. Shows the full grid of plans with a monthly/yearly
 * toggle above. The plan definitions come from the server so the
 * pricing copy can be updated without a frontend deploy.
 *
 * Exported as a named `PlansPage` for tests that want to mount it
 * with a mock `onUpgrade`, and as a default-exported `Plans` that
 * wires `onUpgrade` through the real `usePlanUpgrade` hook.
 */
export const PlansPage = ({ onUpgrade, isUpgrading }: PlansPageProps) => {
  const { t } = useTranslation("billing");
  const navigate = useNavigate();
  const { userPlan } = useUser();

  const [billingPeriod, setBillingPeriod] =
    useState<BillingInterval>("monthly");

  const {
    data: allPlansData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAllPlans();

  const plans: ApiPlan[] = allPlansData?.plans ?? [];

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
                  aria-label={t("plans.backToPlans")}
                  title={t("plans.backToPlans")}
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                </Button>
                <div>
                  <h1 className="title-page">{t("plans.chooseYourPlan")}</h1>
                  <p className="text-muted-foreground">{t("plans.subtitle")}</p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="pt-4 pb-12">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 max-w-4xl mx-auto leading-[1.2] font-normal">
                  {t("plans.pricingTitle")}
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  {t("plans.subtitle")}
                </p>
              </div>

              <PlanBillingToggle
                value={billingPeriod}
                onChange={setBillingPeriod}
              />

              {/* Plans Grid */}
              <div className="flex justify-center w-full">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-16">
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      aria-hidden="true"
                    />
                    {t("upgradeModal.loadingPlans")}
                  </div>
                ) : isError || !allPlansData ? (
                  <div
                    className="flex flex-col items-center gap-4 py-16"
                    role="alert"
                    aria-live="polite"
                  >
                    <AlertCircle
                      className="w-8 h-8 text-destructive"
                      aria-hidden="true"
                    />
                    <p className="text-muted-foreground">
                      {error?.message ?? t("upgradeModal.upgradeFailed")}
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>
                      {t("paymentCancelled.tryAgain")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl">
                    {plans.map((plan) => {
                      const pricing = getPlanPricing(plan, billingPeriod, t);
                      const isCurrentPlan =
                        plan.plan === userPlan?.toUpperCase();

                      return (
                        <PlanCard
                          key={plan.plan}
                          plan={plan}
                          price={pricing.price}
                          periodLabel={pricing.periodLabel}
                          originalPrice={pricing.originalPrice}
                          altPriceLabel={pricing.altPriceLabel}
                          isCurrentPlan={isCurrentPlan}
                          onUpgrade={onUpgrade}
                          billingInterval={billingPeriod}
                          isUpgrading={isUpgrading}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

/**
 * Default-exported Plans page, wired to the real upgrade handler
 * via `usePlanUpgrade`. Split from `PlansPage` so tests can mount
 * the named export with a mock upgrade callback.
 */
const Plans = () => {
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();
  return <PlansPage onUpgrade={handleUpgrade} isUpgrading={isUpgrading} />;
};

export default Plans;
