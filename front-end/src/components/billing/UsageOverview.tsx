import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Server, MessageSquare } from "lucide-react";

interface UsageOverviewProps {
  currentUsage: {
    servers: number;
    users: number;
    queues: number;
    messagesThisMonth: number;
  };
  planFeatures?: {
    maxServers?: number;
    maxUsers?: number;
    maxQueues?: number;
    maxMessagesPerMonth?: number;
  };
}

export const UsageOverview: React.FC<UsageOverviewProps> = ({
  currentUsage,
  planFeatures,
}) => {
  const getUsagePercentage = (current: number, max: number | null): number => {
    if (!max) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Servers</p>
              <p className="text-2xl font-bold">{currentUsage.servers}</p>
              <p className="text-xs text-gray-500">
                of {planFeatures?.maxServers || "∞"} max
              </p>
            </div>
            <Server className="w-8 h-8 text-blue-500" />
          </div>
          {planFeatures?.maxServers && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.servers, planFeatures.maxServers))} bg-current`}
                  style={{
                    width: `${getUsagePercentage(currentUsage.servers, planFeatures.maxServers)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Users</p>
              <p className="text-2xl font-bold">{currentUsage.users}</p>
              <p className="text-xs text-gray-500">
                of {planFeatures?.maxUsers || "∞"} max
              </p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
          {planFeatures?.maxUsers && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.users, planFeatures.maxUsers))} bg-current`}
                  style={{
                    width: `${getUsagePercentage(currentUsage.users, planFeatures.maxUsers)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Queues</p>
              <p className="text-2xl font-bold">{currentUsage.queues}</p>
              <p className="text-xs text-gray-500">
                of {planFeatures?.maxQueues || "∞"} max
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
          {planFeatures?.maxQueues && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.queues, planFeatures.maxQueues))} bg-current`}
                  style={{
                    width: `${getUsagePercentage(currentUsage.queues, planFeatures.maxQueues)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Messages This Month</p>
              <p className="text-2xl font-bold">
                {currentUsage.messagesThisMonth.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                of {planFeatures?.maxMessagesPerMonth?.toLocaleString() || "∞"}{" "}
                max
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-orange-500" />
          </div>
          {planFeatures?.maxMessagesPerMonth && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(currentUsage.messagesThisMonth, planFeatures.maxMessagesPerMonth))} bg-current`}
                  style={{
                    width: `${getUsagePercentage(currentUsage.messagesThisMonth, planFeatures.maxMessagesPerMonth)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
