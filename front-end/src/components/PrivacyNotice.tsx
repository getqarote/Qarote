import React from "react";
import { Shield, ShieldCheck, Database, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface PrivacyNoticeProps {
  variant?: "default" | "compact" | "detailed";
}

export function PrivacyNotice({ variant = "default" }: PrivacyNoticeProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">Privacy Mode: No Data Stored</span>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="w-5 h-5 text-blue-600" />
          <AlertTitle className="text-blue-900">
            Privacy & Data Security
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            <div className="space-y-2 mt-2">
              <p>
                We respect your privacy. By default, we{" "}
                <strong>do not store</strong> your RabbitMQ data, messages, or
                connection details. All operations are performed in real-time
                through secure API calls.
              </p>
              <div className="bg-blue-100 rounded p-3 mt-3">
                <h4 className="font-semibold text-blue-900 mb-2">
                  What we don't store by default:
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• RabbitMQ connection credentials</li>
                  <li>• Queue messages and content</li>
                  <li>• Historical metrics data</li>
                  <li>• Server configurations</li>
                  <li>• Exchange and binding details</li>
                </ul>
              </div>
              <div className="bg-amber-100 rounded p-3 mt-3">
                <h4 className="font-semibold text-amber-900 mb-2">
                  Premium features (with consent):
                </h4>
                <p className="text-sm text-amber-800">
                  Historical metrics, message browsing, and data export require
                  secure data storage with your explicit consent. All stored
                  data is encrypted and automatically deleted based on your
                  retention preferences.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Default variant
  return (
    <Alert className="border-blue-200 bg-blue-50 mb-6">
      <Shield className="w-5 h-5 text-blue-600" />
      <AlertTitle className="text-blue-900">Privacy & Data Security</AlertTitle>
      <AlertDescription className="text-blue-700">
        <p className="mt-1">
          We respect your privacy. By default, we <strong>do not store</strong>{" "}
          your RabbitMQ data, messages, or connection details. All operations
          are performed in real-time through secure API calls.
        </p>
        <p className="mt-2">
          <strong>Premium features</strong> (historical metrics, message
          browsing, data export) require secure data storage with your explicit
          consent and are encrypted at rest.
        </p>
      </AlertDescription>
    </Alert>
  );
}

interface DataStorageWarningProps {
  isActive: boolean;
  dataTypes: string[];
  retentionDays: number;
  onManageSettings?: () => void;
}

export function DataStorageWarning({
  isActive,
  dataTypes,
  retentionDays,
  onManageSettings,
}: DataStorageWarningProps) {
  if (!isActive || !dataTypes?.length) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 mb-4 transition-all duration-200">
      <Database className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <AlertTitle className="text-amber-900">Data Storage Active</AlertTitle>
      <AlertDescription className="text-amber-800">
        <div className="space-y-3">
          <p>
            The following data types are being stored securely for{" "}
            {retentionDays} days:
          </p>
          <div className="flex flex-wrap gap-1">
            {dataTypes.map((type) => (
              <Badge
                key={type}
                variant="outline"
                className="text-amber-700 border-amber-300 bg-amber-100"
              >
                {type}
              </Badge>
            ))}
          </div>
          {onManageSettings && (
            <button
              onClick={onManageSettings}
              className="text-sm text-amber-700 underline hover:text-amber-900 transition-colors duration-200"
            >
              Manage Privacy Settings
            </button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface PrivacyStatusIndicatorProps {
  storageMode: "memory_only" | "temporary" | "historical";
  className?: string;
}

export function PrivacyStatusIndicator({
  storageMode,
  className = "",
}: PrivacyStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (storageMode) {
      case "memory_only":
        return {
          icon: ShieldCheck,
          text: "Privacy Mode: No Data Stored",
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "temporary":
        return {
          icon: Shield,
          text: "Temporary Storage: 7 days",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "historical":
        return {
          icon: Database,
          text: "Historical Storage: 30 days",
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
        };
      default:
        return {
          icon: AlertTriangle,
          text: "Unknown Storage Mode",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
}

export function ConsentBanner() {
  const [dismissed, setDismissed] = React.useState(() => {
    // Check localStorage to persist dismissed state
    if (typeof window !== "undefined") {
      return localStorage.getItem("privacy-banner-dismissed") === "true";
    }
    return false;
  });

  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("privacy-banner-dismissed", "true");
    }
  }, []);

  const handleLearnMore = React.useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("privacy-banner-dismissed", "true");
      // Navigate to privacy settings
      window.location.href = "/privacy-settings";
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="bg-blue-600 text-white px-4 py-3 relative z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                This application prioritizes your privacy and security.
              </p>
              <p className="text-xs opacity-90 mt-1">
                We operate in real-time mode by default - no data is stored
                unless you explicitly enable premium features.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleLearnMore}
              className="text-xs text-blue-100 hover:text-white underline transition-colors duration-200 whitespace-nowrap"
              aria-label="Learn more about privacy settings"
            >
              Learn More
            </button>
            <button
              onClick={handleDismiss}
              className="text-blue-100 hover:text-white transition-colors duration-200 p-1 rounded hover:bg-blue-700"
              aria-label="Dismiss privacy banner"
            >
              <span className="sr-only">Close</span>✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
