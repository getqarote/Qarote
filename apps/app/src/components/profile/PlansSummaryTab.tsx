import React from "react";
import { Link } from "react-router";

import { Crown, Loader2, Server, TrendingUp, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { usePlanUpgrade } from "@/hooks/ui/usePlanUpgrade";
import { useUser } from "@/hooks/ui/useUser";

import { UserPlan } from "@/types/plans";

interface PlansSummaryTabProps {
  currentPlan: UserPlan;
  className?: string;
}

export const PlansSummaryTab: React.FC<PlansSummaryTabProps> = ({
  currentPlan,
  className = "",
}) => {
  const { handleUpgrade, isUpgrading } = usePlanUpgrade();
  const { planData } = useUser();
  const currentFeatures = planData?.planFeatures;

  // Helper function to get plan display name
  const getPlanDisplayName = (plan: UserPlan): string => {
    switch (plan) {
      case UserPlan.FREE:
        return "Free";
      case UserPlan.DEVELOPER:
        return "Developer";
      case UserPlan.ENTERPRISE:
        return "Enterprise";
      default:
        return "Unknown";
    }
  };

  // Helper function to get next plan
  const getNextPlan = (plan: UserPlan): UserPlan | null => {
    switch (plan) {
      case UserPlan.FREE:
        return UserPlan.DEVELOPER;
      case UserPlan.DEVELOPER:
        return UserPlan.ENTERPRISE;
      default:
        return null;
    }
  };

  const planBenefits = {
    [UserPlan.FREE]: {
      icon: <Users className="w-5 h-5" />,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      benefits: ["1 RabbitMQ server", "Basic monitoring", "Community support"],
    },
    [UserPlan.DEVELOPER]: {
      icon: <Zap className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      benefits: [
        "Add exchanges",
        "Add virtual hosts",
        "Add RabbitMQ users",
        "Priority support",
      ],
    },
    [UserPlan.ENTERPRISE]: {
      icon: <Crown className="w-5 h-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      benefits: [
        "All Developer features",
        "Email support",
        "Phone support",
        "Screen sharing",
      ],
    },
  };

  const currentPlanInfo = planBenefits[currentPlan];
  const nextPlan = getNextPlan(currentPlan);
  const nextPlanInfo = nextPlan ? planBenefits[nextPlan] : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Plan Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentPlanInfo.bgColor}`}>
                <div className={currentPlanInfo.color}>
                  {currentPlanInfo.icon}
                </div>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getPlanDisplayName(currentPlan)} Plan
                  <Badge variant="outline" className="text-xs">
                    Current
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your active subscription
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">
                What's included:
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentPlanInfo.benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-50 dark:bg-blue-900/200 rounded-full"></div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Features Overview */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-foreground mb-3">
                Plan Features:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {currentFeatures?.canAddQueue ? "✓" : "✗"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add Queues
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {currentFeatures?.canAddExchange ? "✓" : "✗"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add Exchanges
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {currentFeatures?.canAddVirtualHost ? "✓" : "✗"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Add VHosts
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {currentFeatures?.canAddRabbitMQUser ? "✓" : "✗"}
                  </div>
                  <div className="text-xs text-muted-foreground">Add Users</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {currentFeatures?.hasPrioritySupport
                      ? "Priority"
                      : "Community"}
                  </div>
                  <div className="text-xs text-muted-foreground">Support</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Suggestion */}
      {nextPlan && nextPlanInfo && (
        <Card className="border border-purple-200 bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${nextPlanInfo.bgColor}`}>
                    <div className={nextPlanInfo.color}>
                      {nextPlanInfo.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Ready to grow? Upgrade to {getPlanDisplayName(nextPlan)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Unlock more features and higher limits
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-foreground mb-2">
                    You'll get:
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {nextPlanInfo.benefits.map((benefit, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <div className="w-1.5 h-1.5 bg-purple-50 dark:bg-purple-900/200 rounded-full"></div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="ml-4">
                <Button
                  onClick={() => handleUpgrade(nextPlan, "monthly")}
                  className="btn-primary"
                  disabled={isUpgrading}
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upgrade Now"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Billing & Usage</h4>
                <p className="text-sm text-muted-foreground">
                  Manage your subscription
                </p>
              </div>
              <Link to="/billing">
                <Button variant="ghost" size="sm" className="text-blue-600">
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">Compare Plans</h4>
                <p className="text-sm text-muted-foreground">
                  See all available options
                </p>
              </div>
              <Link to="/plans">
                <Button variant="ghost" size="sm" className="text-green-600">
                  Compare
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
