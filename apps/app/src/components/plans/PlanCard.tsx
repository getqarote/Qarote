import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PixelCheck } from "@/components/ui/pixel-check";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
                detail={
                  plan.maxWorkspaces !== null && plan.maxWorkspaces > 1
                    ? `${formatLimit(plan.maxWorkspaces, t)} · ${t("plans.features.singleOrganization")}`
                    : formatLimit(plan.maxWorkspaces, t)
                }
              />
              <PlanFeatureItem
                label={t("plans.features.teamMembers")}
                detail={formatLimit(plan.maxUsers, t)}
              />
              <PlanFeatureItem label={t("plans.features.queueManagement")} />
              {plan.hasAlerts && (
                <PlanFeatureItem label={t("plans.features.alertsWebhooks")} />
              )}
              {plan.hasTopologyVisualization && (
                <PlanFeatureItem
                  label={t("plans.features.topologyVisualization")}
                />
              )}
            </ul>
          </section>

          {/* Intelligence & Diagnostics */}
          <section>
            <h4 className="font-semibold text-foreground mb-3 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
              {t("plans.features.intelligenceDiagnostics")}
            </h4>
            <ul className="space-y-2">
              {intelligenceRowsFromPlan(plan).map((row) => (
                <li key={row.name} className="flex items-start gap-3">
                  <div className="mt-1.5 w-3.5 shrink-0 flex items-start">
                    <PixelCheck
                      className="h-[0.7rem] w-auto shrink-0 text-success"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-foreground flex items-center gap-2">
                      {t(`plans.features.${row.name}`)}
                      {row.soon && (
                        <span className="font-medium px-1 border border-border text-muted-foreground text-[0.65rem]">
                          {soonLabel}
                        </span>
                      )}
                      {row.tooltipKey && (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="cursor-help inline-flex items-center font-medium text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label={t(
                                  `plans.features.${row.tooltipKey}`
                                )}
                              >
                                <svg
                                  className="w-2.5 h-2.5 shrink-0"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3a.75.75 0 1 1 0 1.5A.75.75 0 0 1 8 4Zm-.25 2.75a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0v-4Z" />
                                </svg>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[220px] text-xs"
                            >
                              {t(`plans.features.${row.tooltipKey}`)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </span>
                    {row.detailKey && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`plans.features.${row.detailKey}`)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
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
              {plan.hasAdvancedRoleBasedAccess && (
                <PlanFeatureItem
                  label={t("plans.features.advancedRoleBasedAccess")}
                  detail={t("plans.features.advancedRoleBasedAccessDesc")}
                  soonLabel={
                    plan.hasAdvancedRoleBasedAccess === "coming_soon"
                      ? soonLabel
                      : undefined
                  }
                />
              )}
              {plan.hasRoleBasedAccess && (
                <PlanFeatureItem
                  label={t("plans.features.roleBasedAccess")}
                  detail={t("plans.features.roleBasedAccessDesc")}
                  soonLabel={
                    plan.hasRoleBasedAccess === "coming_soon"
                      ? soonLabel
                      : undefined
                  }
                />
              )}
              {plan.hasAuditLog && (
                <PlanFeatureItem
                  label={t("plans.features.auditLog")}
                  soonLabel={
                    plan.hasAuditLog === "coming_soon" ? soonLabel : undefined
                  }
                />
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
              {plan.hasCommunitySupport &&
                !plan.hasEmailSupport &&
                !plan.hasPrioritySupport && (
                  <PlanFeatureItem
                    label={t("plans.features.communitySupport")}
                  />
                )}
              {plan.hasEmailSupport && (
                <PlanFeatureItem label={t("plans.features.emailSupport")} />
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

type IntelligenceRow = {
  name: string;
  detailKey?: string;
  tooltipKey?: string;
  soon?: boolean;
};

function intelligenceRowsFromPlan(plan: ApiPlan): IntelligenceRow[] {
  const isFree = plan.plan === "FREE";
  const isEnterprise = plan.plan === "ENTERPRISE";
  const rows: IntelligenceRow[] = [];

  if (plan.hasDailyDigest) {
    rows.push({
      name: "dailyDigest",
      detailKey: isFree
        ? "detailWeekly"
        : isEnterprise
          ? "detailDailyCustom"
          : "detailDaily",
    });
  }
  if (plan.hasMessageSpy) {
    rows.push({
      name: "messageSpy",
      detailKey:
        plan.hasMessageSpy === "limited"
          ? "detail5Messages"
          : "detailUnlimitedMessages",
      tooltipKey:
        plan.hasMessageSpy === "limited" ? "messageSpyLimitedHint" : undefined,
    });
  }
  if (plan.hasMetricsPersistence) {
    // Metrics are stored for a uniform 30 days (TimescaleDB chunk-drop). FREE is
    // limited to a 6h query window; paid plans query the full 30 days.
    rows.push({
      name: "metricsPersistence",
      detailKey: isFree ? "detail6h" : "detail30Days",
    });
  }
  if (plan.hasIncidentDiagnosis) {
    // Full detection on every plan (CE/EE split) — the AI Explain layer is the
    // premium differentiator, surfaced via its own aiExplanations row.
    rows.push({
      name: "incidentDiagnosis",
      detailKey: "detailFullResults",
    });
  }
  if (plan.hasMessageTracing) {
    // Trace events are stored for a uniform 7 days (TimescaleDB chunk-drop).
    // FREE gets a 6h preview window; paid plans query the full 7 days.
    rows.push({
      name: "messageTracing",
      detailKey: isFree ? "detail6h" : "detail7Days",
    });
  }
  if (plan.hasLlmExplain) {
    rows.push({
      name: "aiExplanations",
      detailKey:
        plan.llmExplainsPerMonth === null
          ? "detailUnlimited"
          : plan.llmExplainsPerMonth === 5
            ? "detail5PerMonth"
            : "detail50PerMonth",
      soon: plan.hasLlmExplain === "coming_soon",
    });
  }
  if (plan.hasLlmDigest) {
    rows.push({
      name: "aiEnhancedDigest",
      soon: plan.hasLlmDigest === "coming_soon",
    });
  }

  return rows;
}
