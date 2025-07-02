import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { WorkspacePlan } from "@/types/plans";

interface SubscriptionManagementProps {
  currentPlan: WorkspacePlan;
  onOpenBillingPortal: () => void;
  onUpgrade: (plan: WorkspacePlan, interval: "monthly" | "yearly") => void;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  currentPlan,
  onOpenBillingPortal,
  onUpgrade,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Subscription Management</CardTitle>
            <p className="text-sm text-gray-600">
              Manage your plan, billing cycle, and subscription settings
            </p>
          </div>
          {/* Cancel Subscription */}
          <Button
            onClick={() => onUpgrade(WorkspacePlan.FREE, "monthly")}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel Subscription
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Content can be added here for other subscription management features */}
      </CardContent>
    </Card>
  );
};
