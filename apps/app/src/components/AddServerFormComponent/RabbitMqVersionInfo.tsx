import { useState } from "react";

import {
  ArrowUpCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  InfoIcon,
  X,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useCurrentPlan } from "@/hooks/queries/usePlans";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

interface RabbitMqVersionInfoProps {
  className?: string;
}

export const RabbitMqVersionInfo = ({
  className,
}: RabbitMqVersionInfoProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManagementAlertDismissed, setIsManagementAlertDismissed] =
    useState(false);
  const { workspace } = useWorkspace();
  const { userPlan } = useUser();

  const { data: planData, isLoading } = useCurrentPlan();

  if (isLoading || !planData) {
    return null;
  }
  const { planFeatures } = planData;
  const supportedVersions = planFeatures.supportedRabbitMqVersions;
  const isFreePlan = userPlan === "FREE";

  // Generate all versions to display based on plan
  // FREE plan: Only show LTS versions
  // DEVELOPER/ENTERPRISE: Show all supported versions
  const ltsVersions = ["3.12", "3.13", "4.0", "4.1"];
  const all3xVersions = [
    "3.13",
    "3.12",
    "3.11",
    "3.10",
    "3.9",
    "3.8",
    "3.7",
    "3.6",
    "3.5",
    "3.4",
    "3.3",
    "3.2",
    "3.1",
    "3.0",
  ];
  const all4xVersions = ["4.2", "4.1", "4.0"];

  const allVersions = isFreePlan
    ? ltsVersions
    : [...all3xVersions, ...all4xVersions];

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
              plugin port (default: <strong>15672</strong> for HTTP,{" "}
              <strong>443</strong> for HTTPS URLs), not the AMQP broker port (
              <strong>5672</strong>).
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
      <Alert className="[&>svg]:top-1/2 [&>svg]:-translate-y-1/2">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription className="translate-y-0!">
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
                    const isLts = ltsVersions.includes(version);
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
                        RabbitMQ {version}
                        {isLts && " LTS"}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {isFreePlan && (
                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle className="h-4 w-4" />
                    <span className="font-medium">
                      Upgrade for More Versions
                    </span>
                  </div>
                  <p>
                    Upgrade to <strong>Developer</strong> or{" "}
                    <strong>Enterprise</strong> plan to connect to all RabbitMQ
                    versions (3.0-4.x), including non-LTS versions.
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
