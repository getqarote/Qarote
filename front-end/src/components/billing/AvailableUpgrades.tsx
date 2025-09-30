import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlan } from "@/types/plans";

interface AvailableUpgradesProps {
  currentPlan: UserPlan;
  onUpgrade: (plan: UserPlan, interval: "monthly" | "yearly") => void;
}

export const AvailableUpgrades: React.FC<AvailableUpgradesProps> = ({
  currentPlan,
  onUpgrade,
}) => {
  if (currentPlan === UserPlan.ENTERPRISE) {
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
          {currentPlan === UserPlan.FREE && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Developer Plan</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Perfect for growing teams
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Add exchanges</li>
                  <li>• Add virtual hosts</li>
                  <li>• Add RabbitMQ users</li>
                  <li>• Priority support</li>
                </ul>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">$10</div>
                <div className="text-sm text-gray-600">per month</div>
                <Button
                  onClick={() => onUpgrade(UserPlan.DEVELOPER, "monthly")}
                  className="mt-2"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}

          {currentPlan === UserPlan.DEVELOPER && (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-purple-50">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Enterprise Plan</h3>
                <p className="text-sm text-gray-600 mb-2">
                  For enterprise needs
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• All Developer features</li>
                  <li>• Email support</li>
                  <li>• Phone support</li>
                  <li>• Screen sharing</li>
                </ul>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">$50</div>
                <div className="text-sm text-gray-600">per month</div>
                <Button
                  onClick={() => onUpgrade(UserPlan.ENTERPRISE, "monthly")}
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
