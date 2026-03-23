import { useTranslation } from "react-i18next";

import { CreditCard } from "lucide-react";

import { PlansSummaryTab } from "@/components/profile/PlansSummaryTab";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrgBillingInfo } from "@/hooks/queries/useOrganization";
import { useUser } from "@/hooks/ui/useUser";

const BillingSection = () => {
  const { t } = useTranslation("billing");
  const { userPlan } = useUser();
  const { data: billingInfo, isLoading } = useOrgBillingInfo();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">
              {t("section.billingTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("section.noInfo")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-semibold">{t("section.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("section.subtitle")}
          </p>
        </div>
      </div>

      {/* Current Plan with features */}
      <PlansSummaryTab currentPlan={userPlan} />
    </div>
  );
};

export default BillingSection;
