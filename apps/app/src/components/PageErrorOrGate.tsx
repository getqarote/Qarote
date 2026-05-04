/**
 * Drop-in replacement for `<PageError>` that auto-detects feature-gate
 * errors on the wire and renders the canonical `<FeatureGateCard>` for
 * them, falling through to the generic confused-rabbit error for any
 * other failure.
 *
 * The default `<PageError>` shows "Unable to reach the RabbitMQ server"
 * for every truthy error — including 403 `feature_gate_blocked` — which
 * misleads paid users hitting plan-gated routes. This component is the
 * recommended pattern for any page whose query can return a gate error.
 */

import { readGateError } from "@/lib/feature-gate/readGateError";

import { FeatureGateCard } from "@/components/feature-gate/FeatureGateCard";
import { PageError } from "@/components/PageError";

interface PageErrorOrGateProps {
  /** The raw error from a TanStack Query / tRPC hook. */
  error: unknown;
  /** Generic fallback shown when the error is *not* a gate error. */
  fallbackMessage: string;
  /** Optional retry callback for non-gate errors. */
  onRetry?: () => void;
}

export function PageErrorOrGate({
  error,
  fallbackMessage,
  onRetry,
}: PageErrorOrGateProps) {
  const gate = readGateError(error);
  if (gate) return <FeatureGateCard payload={gate} />;
  return <PageError message={fallbackMessage} onRetry={onRetry} />;
}
