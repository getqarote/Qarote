import { CreditCard } from "lucide-react";

import { PlansSummaryTab } from "@/components/profile/PlansSummaryTab";
import { Skeleton } from "@/components/ui/skeleton";

import { useOrgBillingInfo } from "@/hooks/queries/useOrganization";
import { useUser } from "@/hooks/ui/useUser";

const BillingSection = () => {
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
            <h2 className="text-xl font-semibold">Billing</h2>
            <p className="text-sm text-muted-foreground">
              No organization billing information available.
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
          <h2 className="text-xl font-semibold">Subscription</h2>
          <p className="text-sm text-muted-foreground">
            Manage your organization&apos;s subscription and billing
          </p>
        </div>
      </div>

      {/* Current Plan with features */}
      <PlansSummaryTab currentPlan={userPlan} />
    </div>
  );
};

export default BillingSection;
