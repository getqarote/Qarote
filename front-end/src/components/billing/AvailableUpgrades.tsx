import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkspacePlan } from "@/types/plans";

interface AvailableUpgradesProps {
  currentPlan: WorkspacePlan;
  onUpgrade: (plan: WorkspacePlan, interval: "monthly" | "yearly") => void;
}

export const AvailableUpgrades: React.FC<AvailableUpgradesProps> = ({
  currentPlan,
  onUpgrade,
}) => {
  if (currentPlan === WorkspacePlan.BUSINESS) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Upgrades</CardTitle>
        <p className="text-sm text-gray-600">
          Compare your current plan with higher tiers
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Show next tier */}
          {currentPlan === WorkspacePlan.FREE && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Developer Plan</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Perfect for growing teams
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 2 RabbitMQ servers</li>
                  <li>• 10 queues</li>
                  <li>• 100 messages/month</li>
                  <li>• Data export</li>
                </ul>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">$29</div>
                <div className="text-sm text-gray-600">per month</div>
                <Button
                  onClick={() => onUpgrade(WorkspacePlan.DEVELOPER, "monthly")}
                  className="mt-2"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}

          {currentPlan === WorkspacePlan.DEVELOPER && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-purple-50">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Startup Plan</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Scale your business
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 5 RabbitMQ servers</li>
                  <li>• 50 queues</li>
                  <li>• 1K messages/month</li>
                  <li>• Advanced metrics</li>
                  <li>• Smart alerts</li>
                </ul>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">$99</div>
                <div className="text-sm text-gray-600">per month</div>
                <Button
                  onClick={() => onUpgrade(WorkspacePlan.STARTUP, "monthly")}
                  className="mt-2"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}

          {currentPlan === WorkspacePlan.STARTUP && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Business Plan</h3>
                <p className="text-sm text-gray-600 mb-2">Enterprise ready</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Unlimited servers</li>
                  <li>• 200 queues</li>
                  <li>• Unlimited messages</li>
                  <li>• Priority support</li>
                  <li>• All features</li>
                </ul>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">$299</div>
                <div className="text-sm text-gray-600">per month</div>
                <Button
                  onClick={() => onUpgrade(WorkspacePlan.BUSINESS, "monthly")}
                  className="mt-2"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
