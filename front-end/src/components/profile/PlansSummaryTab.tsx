import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Crown,
  Zap,
  Users,
  Server,
  TrendingUp,
} from "lucide-react";
import { WorkspacePlan } from "@/types/plans";
import { usePlanUpgrade } from "@/hooks/usePlanUpgrade";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PlansSummaryTabProps {
  currentPlan: WorkspacePlan;
  className?: string;
}

export const PlansSummaryTab: React.FC<PlansSummaryTabProps> = ({
  currentPlan,
  className = "",
}) => {
  const { handleUpgrade } = usePlanUpgrade();
  const { planData } = useWorkspace();
  const currentFeatures = planData?.planFeatures;

  // Helper function to get plan display name
  const getPlanDisplayName = (plan: WorkspacePlan): string => {
    switch (plan) {
      case WorkspacePlan.FREE:
        return "Free";
      case WorkspacePlan.DEVELOPER:
        return "Developer";
      case WorkspacePlan.STARTUP:
        return "Startup";
      case WorkspacePlan.BUSINESS:
        return "Business";
      default:
        return "Unknown";
    }
  };

  // Helper function to get next plan
  const getNextPlan = (plan: WorkspacePlan): WorkspacePlan | null => {
    switch (plan) {
      case WorkspacePlan.FREE:
        return WorkspacePlan.DEVELOPER;
      case WorkspacePlan.DEVELOPER:
        return WorkspacePlan.STARTUP;
      case WorkspacePlan.STARTUP:
        return WorkspacePlan.BUSINESS;
      default:
        return null;
    }
  };

  const planBenefits = {
    [WorkspacePlan.FREE]: {
      icon: <Users className="w-5 h-5" />,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      benefits: ["1 RabbitMQ server", "Basic monitoring", "Community support"],
    },
    [WorkspacePlan.DEVELOPER]: {
      icon: <Zap className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      benefits: ["2 servers", "10 queues", "100 messages/month", "Data export"],
    },
    [WorkspacePlan.STARTUP]: {
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      benefits: [
        "5 servers",
        "50 queues",
        "1K messages/month",
        "Advanced metrics",
        "Smart alerts",
      ],
    },
    [WorkspacePlan.BUSINESS]: {
      icon: <Crown className="w-5 h-5" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      benefits: [
        "Unlimited servers",
        "200 queues",
        "Unlimited messages",
        "Priority support",
        "All features",
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
                <p className="text-sm text-gray-600 mt-1">
                  Your active subscription
                </p>
              </div>
            </div>
            <Link to="/plans">
              <Button variant="outline" size="sm">
                View All Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                What's included:
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentPlanInfo.benefits.map((benefit, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Usage Overview */}
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 mb-3">Current Usage:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentFeatures.maxServers || "∞"}
                  </div>
                  <div className="text-xs text-gray-600">Servers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentFeatures.maxQueues || "∞"}
                  </div>
                  <div className="text-xs text-gray-600">Queues</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentFeatures.maxUsers || "∞"}
                  </div>
                  <div className="text-xs text-gray-600">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {currentFeatures.maxMessagesPerMonth
                      ? `${(currentFeatures.maxMessagesPerMonth / 1000).toFixed(0)}K`
                      : "∞"}
                  </div>
                  <div className="text-xs text-gray-600">Messages/mo</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Suggestion */}
      {nextPlan && nextPlanInfo && (
        <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
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
                    <h3 className="font-semibold text-gray-900">
                      Ready to grow? Upgrade to {getPlanDisplayName(nextPlan)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Unlock more features and higher limits
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    You'll get:
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {nextPlanInfo.benefits.map((benefit, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="ml-4">
                <Button
                  onClick={() => handleUpgrade(nextPlan, "monthly")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Upgrade Now
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
              <div className="p-2 bg-blue-50 rounded-lg">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Billing & Usage</h4>
                <p className="text-sm text-gray-600">
                  Manage your subscription
                </p>
              </div>
              <Link to="/payments/billing">
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
                <h4 className="font-medium text-gray-900">Compare Plans</h4>
                <p className="text-sm text-gray-600">
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
