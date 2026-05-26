import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckCircle2, Radio, WifiOff } from "lucide-react";

import { TracingDisabledState } from "@/components/tracing/TracingDisabledState";
import { Button } from "@/components/ui/button";

import { useServerContext } from "@/contexts/ServerContext";

import {
  useFirehoseStatus,
  useSetTraceEnabled,
} from "@/hooks/queries/useMessageRecording";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

/**
 * Settings → Integrations. Permanent home for the Firehose Tracing enable
 * flow (relocated from the now-hidden /messages page, T19) so AI incident
 * diagnostics can be enriched with firehose evidence. Positioned as an opt-in
 * "richer diagnostics" mode, not a missing feature.
 *
 * Reuses the presentational `<TracingDisabledState>` — the same vhost-status +
 * confirm-and-enable UX that lived on the Messages page — wired here to the
 * firehose status query + the trace-enable mutation. The component surfaces
 * the enable error itself (it catches a rejected `onEnable`), so `handleEnable`
 * just throws on a non-success result.
 */
const IntegrationsSection = () => {
  const { t } = useTranslation("tracing");
  const { selectedServerId } = useServerContext();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id;

  const { data: firehoseStatus, refetch } = useFirehoseStatus(
    selectedServerId ?? "",
    !!selectedServerId
  );
  const setTraceEnabled = useSetTraceEnabled();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnable = async () => {
    // Reachable while the workspace is still resolving (server selected but
    // workspace?.id not yet loaded → firehose query disabled → this CTA still
    // renders). Throw rather than silently no-op so TracingDisabledState's
    // own catch surfaces a visible error instead of a dead button.
    if (!selectedServerId || !workspaceId) {
      throw new Error(t("empty.firehose.enableError"));
    }
    setIsEnabling(true);
    try {
      const result = await setTraceEnabled.mutateAsync({
        serverId: selectedServerId,
        workspaceId,
        enabled: true,
      });
      // Refetch first so the per-vhost status reflects reality even on a
      // partial enable (tracing is best-effort/broker-wide — some vhosts can
      // flip while others fail). Then surface any failures as an error.
      await refetch();
      if (!result.success) {
        throw new Error(
          result.failedVhosts?.length
            ? `${t("empty.firehose.enableError")}: ${result.failedVhosts.join(", ")}`
            : t("empty.firehose.enableError")
        );
      }
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-semibold">{t("integrations.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("integrations.description")}
          </p>
        </div>
      </div>

      {!selectedServerId ? (
        <p className="text-sm text-muted-foreground">
          {t("integrations.noServer")}
        </p>
      ) : firehoseStatus?.error === "management_api_unavailable" ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-card px-4 py-4">
          <div className="flex items-start gap-2">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("empty.managementApi.title")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("empty.managementApi.description")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t("empty.managementApi.retry")}
          </Button>
        </div>
      ) : firehoseStatus?.active ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("integrations.active")}
        </p>
      ) : (
        <TracingDisabledState
          vhosts={firehoseStatus?.vhosts ?? []}
          onEnable={handleEnable}
          isEnabling={isEnabling}
        />
      )}
    </div>
  );
};

export default IntegrationsSection;
