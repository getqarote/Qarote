import { EnhancedErrorDisplay } from "@/components/EnhancedErrorDisplay";

import type { ConnectionStatus } from "./types";

interface ConnectionStatusDisplayProps {
  connectionStatus: ConnectionStatus;
  onUpgrade?: () => void;
}

/**
 * Renders a connection error when present. Successful connections are
 * represented by advancing to step 2, so this component only surfaces errors.
 */
export const ConnectionStatusDisplay = ({
  connectionStatus,
  onUpgrade,
}: ConnectionStatusDisplayProps) => {
  if (connectionStatus.status !== "error") {
    return null;
  }
  const error = new Error(connectionStatus.message);
  return <EnhancedErrorDisplay error={error} onUpgrade={onUpgrade} />;
};
