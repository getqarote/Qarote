import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { UserPlan } from "@/types/plans";

import { PlanFeatureItem } from "./PlanFeatureItem";
import { type ApiPlan, type BillingInterval, formatLimit } from "./planHelpers";

interface PlanCardProps {
  plan: ApiPlan;
  price: string;
  periodLabel: string;
  originalPrice?: string;
  altPriceLabel?: string;
  isCurrentPlan: boolean;
  billingInterval: BillingInterval;
  isUpgrading?: boolean;
  onUpgrade: (plan: UserPlan, billingInterval: BillingInterval) => void;
}

/**
 * A single pricing card rendered in the plans grid. Shows the plan
 * name, price (with yearly/monthly toggle awareness), feature list
 * grouped into Core / Security / Support sections, and an upgrade
 * CTA that's disabled when the plan is the caller's current plan.
 *
 * Previously inlined as a 175-line component at the top of Plans.tsx;
 * extracted here so the page file can focus on page-level concerns
 * (layout, billing toggle, loading/error states).
 */
export function PlanCard({
  plan,
  price,
  periodLabel,
  originalPrice,
  altPriceLabel,
  isCurrentPlan,
  billingInterval,
  isUpgrading,
  onUpgrade,
}: PlanCardProps) {
  const { t } = useTranslation("billing");

  const soonLabel = t("plans.features.soon");
  const versionDetail = plan.ltsOnly
    ? t("plans.features.ltsVersions")
    : t("plans.features.allVersions");

  return (
    <Card className="relative flex h-full flex-col bg-transparent">
      <CardContent className="p-6 flex flex-col h-full">
        <PlanBadge isCurrentPlan={isCurrentPlan} isPopular={plan.isPopular} />

        <PlanHeader
          displayName={plan.displayName}
          price={price}
          periodLabel={periodLabel}
          originalPrice={originalPrice}
          altPriceLabel={altPriceLabel}
          billingInterval={billingInterval}
          hasCost={plan.monthlyPrice > 0}
        />

        <hr className="border-border mt-4 mb-8" />

        <div className="space-y-6 flex-1">
          {/* Core Features */}
          <section>
            <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
              {t("plans.features.coreFeatures")}
            </h4>
            <ul className="space-y-2">
              <PlanFeatureItem
                label={t("plans.features.rabbitMQServers")}
                detail={formatLimit(plan.maxServers, t)}
              />
              <PlanFeatureItem
                label={t("plans.features.workspaces")}
                detail={formatLimit(plan.maxWorkspaces, t)}
              />
              <PlanFeatureItem
                label={t("plans.features.teamMembers")}
                detail={formatLimit(plan.maxUsers, t)}
              />
              {plan.hasAdvancedAnalytics && (
                <PlanFeatureItem
                  label={t("plans.features.advancedAnalytics")}
                />
              )}
              <PlanFeatureItem label={t("plans.features.queueManagement")} />
              {plan.hasAlerts && (
                <PlanFeatureItem label={t("plans.features.alertsWebhooks")} />
              )}
              {plan.hasTopologyVisualization && (
                <PlanFeatureItem
                  label={t("plans.features.topologyVisualization")}
                />
              )}
              {plan.hasRoleBasedAccess && (
                <PlanFeatureItem
                  label={t("plans.features.roleBasedAccess")}
                  soonLabel={
                    plan.hasRoleBasedAccess === "coming_soon"
                      ? soonLabel
                      : undefined
                  }
                />
              )}
            </ul>
          </section>

          {/* Security & Compatibility */}
          <section className="mt-auto space-y-4">
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.securityCompatibility")}
            </h4>
            <ul className="space-y-2">
              {plan.hasSsoSamlOidc && (
                <PlanFeatureItem label={t("plans.features.ssoSamlOidc")} />
              )}
              {plan.hasSoc2Compliance && (
                <PlanFeatureItem label={t("plans.features.soc2Compliance")} />
              )}
              <PlanFeatureItem
                label={t("plans.features.rabbitMQVersionSupport")}
                detail={versionDetail}
              />
            </ul>
          </section>

          {/* Support */}
          <section className="mt-auto space-y-4">
            <h4 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
              {t("plans.features.support")}
            </h4>
            <ul className="space-y-2">
              {plan.hasCommunitySupport && (
                <PlanFeatureItem label={t("plans.features.communitySupport")} />
              )}
              {plan.hasPrioritySupport && (
                <PlanFeatureItem label={t("plans.features.prioritySupport")} />
              )}
            </ul>
          </section>
        </div>

        <Button
          onClick={() => onUpgrade(plan.plan as UserPlan, billingInterval)}
          variant={isCurrentPlan ? "outline" : "default"}
          className="w-full mt-6 px-4 py-3 sm:px-7 sm:py-3 text-base sm:text-lg h-auto rounded-full"
          disabled={isCurrentPlan || isUpgrading}
        >
          {isCurrentPlan
            ? t("plans.currentPlan")
            : plan.monthlyPrice === 0
              ? t("plans.getStarted")
              : t("plans.startFree")}
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanBadge({
  isCurrentPlan,
  isPopular,
}: {
  isCurrentPlan: boolean;
  isPopular: boolean;
}) {
  const { t } = useTranslation("billing");

  if (isCurrentPlan) {
    return (
      <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-primary text-primary">
        {t("plans.currentPlan")}
      </span>
    );
  }

  if (isPopular) {
    return (
      <span className="absolute top-4 right-4 text-xs font-medium px-2 py-0.5 border border-primary text-primary">
        {t("plans.mostPopular")}
      </span>
    );
  }

  return null;
}

function PlanHeader({
  displayName,
  price,
  periodLabel,
  originalPrice,
  altPriceLabel,
  billingInterval,
  hasCost,
}: {
  displayName: string;
  price: string;
  periodLabel: string;
  originalPrice?: string;
  altPriceLabel?: string;
  billingInterval: BillingInterval;
  hasCost: boolean;
}) {
  const { t } = useTranslation("billing");

  return (
    <div className="text-left">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-2xl font-normal text-foreground">{displayName}</h3>
      </div>

      <div className="mb-2 flex flex-col justify-start min-h-[90px]">
        <div className="flex items-center justify-start gap-4">
          <span className="text-5xl font-medium text-foreground font-mono tabular-nums">
            {price}
          </span>
          {hasCost && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-muted-foreground">
                /{periodLabel}
              </span>
              {billingInterval === "yearly" && (
                <span className="text-sm text-muted-foreground">
                  {t("plans.billingToggle.billedYearly")}
                </span>
              )}
            </div>
          )}
        </div>
        {originalPrice && altPriceLabel && (
          <span className="text-sm text-muted-foreground mt-4">
            <span className="font-medium text-foreground font-mono tabular-nums">
              {originalPrice}
            </span>{" "}
            {altPriceLabel}
          </span>
        )}
      </div>
    </div>
  );
}
