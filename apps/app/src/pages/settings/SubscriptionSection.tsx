import { useTranslation } from "react-i18next";

import { CreditCard } from "lucide-react";

import { PlansSummaryTab } from "@/components/profile/PlansSummaryTab";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrgBillingInfo } from "@/hooks/queries/useOrganization";
import { useUser } from "@/hooks/ui/useUser";

/**
 * `/settings/subscription` — the in-settings entry point for the
 * operator's plan and subscription summary. Matches the primary-
 * tinted badge header pattern used by SSOHeader / OrgContextHeader
 * so the operator sees a consistent header treatment across every
 * settings surface. The actual plan overview and upgrade CTAs
 * live in `PlansSummaryTab` so this file stays a thin wrapper.
 */
const SubscriptionSection = () => {
  const { t } = useTranslation("billing");
  const { userPlan } = useUser();
  const { data: billingInfo, isLoading } = useOrgBillingInfo();

  const header = (subtitleKey: "section.subtitle" | "section.noInfo") => (
    <div className="flex items-center gap-3 pb-2">
      <div
        className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0"
        aria-hidden="true"
      >
        <CreditCard className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-tight">
          {t("section.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t(subtitleKey)}</p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header("section.subtitle")}
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!billingInfo) {
    return <div className="space-y-6">{header("section.noInfo")}</div>;
  }

  return (
    <div className="space-y-6">
      {header("section.subtitle")}
      <PlansSummaryTab currentPlan={userPlan} />
    </div>
  );
};

export default SubscriptionSection;
