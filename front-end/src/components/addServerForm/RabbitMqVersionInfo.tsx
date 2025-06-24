import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InfoIcon,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { PlanLimitsResponse } from "@/lib/api/workspaceClient";

interface RabbitMqVersionInfoProps {
  className?: string;
}

export const RabbitMqVersionInfo = ({
  className,
}: RabbitMqVersionInfoProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: planLimits, isLoading } = useQuery<PlanLimitsResponse>({
    queryKey: ["plan-limits"],
    queryFn: () => apiClient.getCurrentPlanLimits(),
  });

  if (isLoading || !planLimits) {
    return null;
  }

  const { plan, limits } = planLimits;
  const supportedVersions = limits.supportedRabbitMqVersions;
  const allVersions = ["3.12", "3.13", "4.0", "4.1"];

  const isRestrictedPlan = plan === "FREE" || plan === "FREELANCE";

  return (
    <div className={className}>
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">
              RabbitMQ Version Support ({plan} Plan)
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
