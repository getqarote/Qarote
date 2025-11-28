import { CheckCircle } from "lucide-react";

import { EnhancedErrorDisplay } from "@/components/EnhancedErrorDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { ConnectionStatus } from "./types";

interface ConnectionStatusDisplayProps {
  connectionStatus: ConnectionStatus;
  onUpgrade?: () => void; // Callback for upgrade action
}

export const ConnectionStatusDisplay = ({
  connectionStatus,
  onUpgrade,
}: ConnectionStatusDisplayProps) => {
  if (connectionStatus.status === "idle") {
    return null;
  }

  // Use enhanced error display for error status
  if (connectionStatus.status === "error") {
    const error = new Error(connectionStatus.message);
    return <EnhancedErrorDisplay error={error} onUpgrade={onUpgrade} />;
  }

  // Success status
  return (
    <Alert className="border-green-500">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription>
        {connectionStatus.message}
        {connectionStatus.details && (
          <div className="mt-2 text-sm text-gray-600">
            <p>RabbitMQ Version: {connectionStatus.details.version}</p>
            <p>Cluster: {connectionStatus.details.cluster_name}</p>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
