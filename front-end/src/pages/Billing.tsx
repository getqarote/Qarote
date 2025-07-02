import React from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import logger from "@/lib/logger";
import { BillingOverviewResponse } from "@/lib/api/paymentClient";
import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import {
  BillingHeader,
  BillingLayout,
  SubscriptionManagement,
  RecentPayments,
} from "@/components/billing";

const Billing: React.FC = () => {
  const { workspace } = useWorkspace();
  const { handleUpgrade } = usePlanUpgrade();

  const {
    data: billingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["billing", workspace?.id],
    queryFn: async (): Promise<BillingOverviewResponse> => {
      if (!workspace?.id) throw new Error("No workspace");
      return await apiClient.getBillingOverview();
    },
    enabled: !!workspace?.id,
  });

  const handleOpenBillingPortal = async () => {
    try {
      const data = await apiClient.createBillingPortalSession();
      window.open(data.url, "_blank");
    } catch (error) {
      logger.error("Failed to open billing portal:", error);
    }
  };

  return (
    <BillingLayout isLoading={isLoading} error={!!error || !billingData}>
      {billingData &&
        (console.log("Billing data:", billingData),
        (
          <>
            <BillingHeader
              hasSubscription={!!billingData.subscription}
              onOpenBillingPortal={handleOpenBillingPortal}
            />

            {billingData.subscription && (
              <SubscriptionManagement
                currentPlan={billingData.workspace.plan}
                onOpenBillingPortal={handleOpenBillingPortal}
                onUpgrade={handleUpgrade}
              />
            )}

            <RecentPayments recentPayments={billingData.recentPayments} />
          </>
        ))}
    </BillingLayout>
  );
};

export default Billing;
