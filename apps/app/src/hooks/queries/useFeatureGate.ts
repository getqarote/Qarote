/**
 * Resolve a feature gate proactively, before a gated procedure throws.
 *
 * Calls `featureGate.evaluate` on the backend, which composes the same
 * three axes (capability → license → plan) used by every premium
 * procedure. The proactive view and the reactive (error-driven) view
 * never disagree because they share the resolver — see ADR-002.
 *
 * Use this when the page can render meaningfully different content
 * based on entitlement (e.g. mode picker default, sidebar badge).
 * Pages that just need to render `<FeatureGateCard>` from a procedure
 * error should use `readGateError(err)` instead — that's the cheaper
 * path.
 *
 * **Lives in `hooks/queries/`** (codebase convention for tRPC query
 * hooks). The pure types and the `queueSubject` helper still live in
 * `lib/feature-gate/` because they're not query-bound.
 */

import type {
  FeatureGateResult,
  FeatureKey,
  GateSubject,
} from "@/lib/feature-gate/types";
import { trpc } from "@/lib/trpc/client";

interface UseFeatureGateOptions {
  serverId?: string | null;
  /**
   * When `false`, skips the query — use alongside `serverId` to avoid
   * firing `featureGate.evaluate` after a server is deleted from the
   * current selection.
   */
  serverExists?: boolean;
  /**
   * Per-object subject. Required by the capability axis for per-object
   * rules — e.g. `message_spy` blocks streams. Pages not targeting a
   * specific object can omit; per-object rules then pass through.
   */
  subject?: GateSubject;
  /** Disable the query (e.g. while a parent component still loads). */
  enabled?: boolean;
}

interface UseFeatureGateResult {
  result: FeatureGateResult | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useFeatureGate(
  feature: FeatureKey,
  options: UseFeatureGateOptions = {}
): UseFeatureGateResult {
  const query = trpc.featureGate.evaluate.useQuery(
    {
      feature,
      serverId: options.serverId,
      subject: options.subject,
    },
    {
      enabled:
        (options.enabled ?? true) &&
        (options.serverExists === undefined || options.serverExists),
      // Capability snapshots refresh on a daily cron and license/plan
      // changes invalidate explicitly — staleTime can be generous.
      // 60 s matches `useCapabilities` so the two queries that drive
      // `<FeatureGate>` settle on the same cadence.
      staleTime: 60_000,
    }
  );

  return {
    result: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
