import { EnhancedErrorDisplay } from "@/components/EnhancedErrorDisplay";
import { FeatureGateCard } from "@/components/feature-gate/FeatureGateCard";

import type { ConnectionStatus } from "./types";

interface ConnectionStatusDisplayProps {
  connectionStatus: ConnectionStatus;
}

/**
 * Renders a connection error when present. Successful connections are
 * represented by advancing to step 2, so this component only surfaces errors.
 *
 * tRPC errors carrying a structured `gate` payload (license / plan /
 * capability blocks per ADR-002) render via `<FeatureGateCard>` so the
 * upgrade CTA, remediation, and i18n message stay consistent with every
 * other gated surface. Plain connection errors (network, auth, broker
 * unreachable) fall through to the generic error display.
 */
export const ConnectionStatusDisplay = ({
  connectionStatus,
}: ConnectionStatusDisplayProps) => {
  if (connectionStatus.status !== "error") {
    return null;
  }

  if (connectionStatus.gate) {
    return <FeatureGateCard payload={connectionStatus.gate} />;
  }

  return <EnhancedErrorDisplay message={connectionStatus.message} />;
};
