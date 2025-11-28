import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ArrowUpCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  InfoIcon,
  X,
  XCircle,
} from "lucide-react";

import { apiClient } from "@/lib/api";
import type { CurrentPlanResponse } from "@/lib/api/planClient";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useUser } from "@/hooks/useUser";
import { useWorkspace } from "@/hooks/useWorkspace";

interface RabbitMqVersionInfoProps {
  className?: string;
}

export const RabbitMqVersionInfo = ({
  className,
}: RabbitMqVersionInfoProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isManagementAlertDismissed, setIsManagementAlertDismissed] =
    useState(false);
  const { workspace } = useWorkspace();
  const { userPlan } = useUser();

  const { data: planData, isLoading } = useQuery<CurrentPlanResponse>({
    queryKey: ["current-plan", workspace?.id],
    queryFn: () => apiClient.getCurrentPlan(),
    enabled: !!workspace?.id,
  });

  if (isLoading || !planData) {
    return null;
  }
  const { planFeatures } = planData;
  const supportedVersions = planFeatures.supportedRabbitMqVersions;
  const allVersions = ["3.12", "3.13", "4.0", "4.1"];
  const isRestrictedPlan = userPlan === "FREE" || userPlan === "DEVELOPER";

  return (
    <div className={className}>
      {/* Management Plugin Requirement Notice */}
      {!isManagementAlertDismissed && (
        <Alert className="mb-4 border-blue-200 bg-blue-50 relative">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 pr-8">
            <div className="font-medium mb-1">
              RabbitMQ Management Plugin Required
            </div>
            <p className="text-sm">
              Ensure the <strong>RabbitMQ Management Plugin</strong> is enabled
              for API access. The port field above should be the Management
              plugin port (default: 15672), not the AMQP broker port (5672).
            </p>
            <p className="text-xs mt-2 opacity-90">
              To enable:{" "}
              <span className="bg-blue-100 px-1 py-0.5 rounded text-xs font-mono">
                rabbitmq-plugins enable rabbitmq_management
              </span>
            </p>
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsManagementAlertDismissed(true)}
            className="absolute top-2 right-6 h-5 w-5 p-0"
          >
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => setIsManagementAlertDismissed(true)}
            />
          </Button>
        </Alert>
      )}

      {/* Version Support Information */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">
              RabbitMQ Version Support ({workspace.plan} Plan)
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isExpanded && (
            <div className="space-y-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  {allVersions.map((version) => {
                    const isSupported = supportedVersions.includes(version);
                    return (
                      <Badge
                        key={version}
                        variant={isSupported ? "default" : "secondary"}
                        className={`flex items-center gap-1 ${
                          isSupported
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {isSupported ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        RabbitMQ {version} LTS
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {isRestrictedPlan && (
                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle className="h-4 w-4" />
                    <span className="font-medium">
                      Upgrade for More Versions
                    </span>
                  </div>
                  <p>
                    Upgrade to <strong>Startup</strong> or{" "}
                    <strong>Business</strong> plan to connect to RabbitMQ{" "}
                    {allVersions
                      .filter((v) => !supportedVersions.includes(v))
                      .join(", ")}{" "}
                    LTS versions.
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-600">
                If you try to connect to an unsupported version, the connection
                will be rejected.
              </div>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};
