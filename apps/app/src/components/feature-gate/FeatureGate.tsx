/**
 * Page-level wrapper that gates a feature on capability availability.
 *
 * Usage:
 *   <FeatureGate feature="message_tracing" serverId={serverId}>
 *     <ActualPageContent />
 *   </FeatureGate>
 *
 * Behaviour:
 *   - While the gate query is loading: render a skeleton (no flash of
 *     "blocked" before the snapshot resolves).
 *   - When the gate is `ok` or `preview`: render `children` as-is.
 *     Preview is plan-axis territory; pages handle the preview banner
 *     themselves via `useFeatureGate` if they need to.
 *   - When the gate is `blocked`: render `<FeatureGateCard>` with the
 *     server-context footer (broker version + last-checked + Re-check).
 *
 * The page consumes nothing about the capability surface beyond `feature`
 * and `serverId`. The component owns query orchestration, invalidation,
 * and the render-decision logic so every page handles capability blocks
 * the same way.
 */

import { useTranslation } from "react-i18next";

import { Info, Loader2 } from "lucide-react";

import type { FeatureKey, GateSubject } from "@/lib/feature-gate/types";

import { FeatureGateCard } from "@/components/feature-gate/FeatureGateCard";

import {
  useCapabilities,
  useRecheckCapabilities,
} from "@/hooks/queries/useCapabilities";
import { useFeatureGate } from "@/hooks/queries/useFeatureGate";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import type { ReactNode } from "react";

interface FeatureGateProps {
  feature: FeatureKey;
  serverId: string;
  /**
   * Per-object subject for features whose capability rule is per-call
   * (currently only `message_spy` blocking streams). Pages not gating
   * a specific queue/exchange/etc. can omit.
   */
  subject?: GateSubject;
  children: ReactNode;
  /**
   * Optional override for the loading skeleton. Pages that want a more
   * specific placeholder pass it; otherwise we render a generic spinner.
   */
  loadingFallback?: ReactNode;
}

export function FeatureGate({
  feature,
  serverId,
  subject,
  children,
  loadingFallback,
}: FeatureGateProps) {
  const { t } = useTranslation("gate");
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";
  const gate = useFeatureGate(feature, { serverId, subject });
  const capabilities = useCapabilities(serverId);
  const recheck = useRecheckCapabilities();

  // Initial load — show a skeleton instead of flashing "blocked"
  // before either query settles. We block on BOTH the gate query and
  // the capabilities query for capability blocks, so the card never
  // appears with `null` version + `null` capabilitiesAt and then
  // re-flows when capabilities resolves a tick later.
  const capsCritical =
    gate.result?.kind === "blocked" && gate.result.blockedBy === "capability";
  if (
    gate.isLoading ||
    !gate.result ||
    (capsCritical && capabilities.isLoading)
  ) {
    return (
      loadingFallback ?? (
        <div
          aria-busy="true"
          className="flex items-center justify-center gap-2 py-24 text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="text-sm">{t("loadingGate")}</span>
        </div>
      )
    );
  }

  if (gate.result.kind === "degraded") {
    // Advisory banner above the feature surface — the feature itself
    // operates normally, the banner just sets expectations (e.g.
    // "diagnosis warming up — first 3h of metrics may produce
    // sparse findings"). Surfaced at the gate boundary so every
    // gated page handles it the same way.
    const params = gate.result.reasonParams as
      | Record<string, string | number>
      | undefined;
    return (
      <>
        <div
          role="status"
          aria-live="polite"
          className="mx-6 mt-4 rounded-md border border-blue-500/30 bg-blue-500/5 px-4 py-2 flex items-start gap-2 text-sm text-blue-700 dark:text-blue-400"
        >
          <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
          <span>{t(gate.result.reasonKey, params)}</span>
        </div>
        {children}
      </>
    );
  }

  if (gate.result.kind !== "blocked") {
    return <>{children}</>;
  }

  // Capability block — render the card with the server context footer
  // so the user can see the broker version + last-checked + Re-check.
  return (
    <FeatureGateCard
      payload={{
        blockedBy: gate.result.blockedBy,
        feature: gate.result.feature,
        reasonKey: gate.result.reasonKey,
        reasonParams: gate.result.reasonParams,
        remediation: gate.result.remediation,
        upgrade: gate.result.upgrade,
        fallback: gate.result.fallback,
      }}
      serverContext={{
        version: capabilities.data?.version ?? null,
        productName: capabilities.data?.productName ?? null,
        capabilitiesAt: capabilities.data?.capabilitiesAt ?? null,
        onRecheck: () => {
          if (!workspaceId) return;
          recheck.mutate({ id: serverId, workspaceId });
        },
        isRechecking: recheck.isPending,
      }}
    />
  );
}
