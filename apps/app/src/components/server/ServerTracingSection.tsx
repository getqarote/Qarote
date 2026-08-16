/**
 * Message tracing (firehose) — per-vhost activation in the Edit Server sheet.
 *
 * The firehose feeds the LLM diagnosis layer, so its enable control lives here
 * (migrated from the now-hidden Messages page). Tracing is genuinely per-vhost:
 * the backend `messages.recording.setEnabled` accepts a `vhost` to target ONE
 * vhost (omit for broker-wide), and `status` reports `tracing` per vhost.
 *
 * Three top-level states:
 *   - not-entitled  → a locked "Developer+" card with an upgrade / license CTA;
 *   - entitled      → per-vhost list (Enable with inline confirm / Disable) +
 *                     a capture-payloads toggle shown once ≥1 vhost is traced;
 *   - no vhost traced → a cost hint that diagnosis has less evidence.
 *
 * Capture payloads persists via `rabbitmq.server.updateServer`
 * ({ payloadCaptureEnabled }) — v1 stores the flag only (no capture pipeline
 * yet). Retention is a fixed 7 days (no knob). Gated on `message_tracing`.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getUpgradePath, isSelfHostedMode } from "@/lib/featureFlags";

import { Button } from "@/components/ui/button";
import {
  IconArrowRight,
  IconFolder,
  IconLock,
  IconSparkle,
} from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";

import {
  useFirehoseStatus,
  useSetTraceEnabled,
} from "@/hooks/queries/useMessageRecording";
import { useUpdateServer } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface ServerTracingSectionProps {
  serverId: string;
  /** Current persisted capture-payloads flag from the server object. */
  payloadCaptureEnabled?: boolean;
}

export function ServerTracingSection({
  serverId,
  payloadCaptureEnabled = false,
}: ServerTracingSectionProps) {
  const { t } = useTranslation("tracing");
  const { hasFeature } = useFeatureFlags();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const entitled = hasFeature("message_tracing");
  const status = useFirehoseStatus(serverId, entitled);
  const setTrace = useSetTraceEnabled();
  const updateServer = useUpdateServer();

  // Per-vhost in-flight state (keyed by vhost name) + a separate flag for the
  // broker-wide "enable/disable all" action.
  const [busyVhost, setBusyVhost] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  // Capture-payloads is optimistic local state seeded from the persisted flag;
  // the mutation reconciles it on settle.
  const [captureEnabled, setCaptureEnabled] = useState(payloadCaptureEnabled);
  const [captureBusy, setCaptureBusy] = useState(false);

  const vhosts = status.data?.vhosts ?? [];
  const tracedCount = vhosts.filter((v) => v.tracing).length;
  const totalCount = vhosts.length;
  const anyTraced = tracedCount > 0;

  const summary =
    totalCount === 0
      ? null
      : tracedCount === 0
        ? t("editServer.summaryOffAll")
        : tracedCount === totalCount
          ? t("editServer.summaryOnAll")
          : t("editServer.summaryOnSome", {
              count: tracedCount,
              total: totalCount,
            });

  const setVhostTracing = async (vhost: string, enabled: boolean) => {
    if (!workspaceId || !serverId) return;
    setBusyVhost(vhost);
    try {
      await setTrace.mutateAsync({ serverId, workspaceId, enabled, vhost });
      await status.refetch();
      toast.success(
        enabled
          ? t("editServer.enabledVhost", { vhost })
          : t("editServer.disabledVhost", { vhost })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("empty.firehose.enableError")
      );
    } finally {
      setBusyVhost(null);
    }
  };

  // Broker-wide toggle. `setEnabled` with no `vhost` targets every vhost in one
  // call (see recording.ts), so "enable/disable all" is a single request, not a
  // client-side loop.
  const setAllTracing = async (enabled: boolean) => {
    if (!workspaceId || !serverId) return;
    setBusyAll(true);
    try {
      await setTrace.mutateAsync({ serverId, workspaceId, enabled });
      await status.refetch();
      toast.success(
        enabled
          ? t("editServer.enabledAllVhosts")
          : t("editServer.disabledAllVhosts")
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("empty.firehose.enableError")
      );
    } finally {
      setBusyAll(false);
    }
  };

  const setCapture = async (enabled: boolean) => {
    if (!workspaceId || !serverId) return;
    setCaptureBusy(true);
    setCaptureEnabled(enabled); // optimistic
    try {
      await updateServer.mutateAsync({
        id: serverId,
        workspaceId,
        payloadCaptureEnabled: enabled,
      });
    } catch (err) {
      setCaptureEnabled(!enabled); // revert
      toast.error(
        err instanceof Error ? err.message : t("editServer.captureError")
      );
    } finally {
      setCaptureBusy(false);
    }
  };

  return (
    <section className="space-y-3 border-t border-border pt-5">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <IconSparkle className="h-4 w-auto shrink-0 text-primary" />
          {t("editServer.title")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("editServer.intro")}{" "}
          <span className="ml-0.5 inline-flex items-center rounded-full border border-success/40 bg-success-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success">
            {t("editServer.metadataOnly")}
          </span>
        </p>
      </div>

      {!entitled ? (
        // Plan-gate — the whole section becomes a locked Developer+ card.
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <IconLock
              className="mt-0.5 h-4 w-auto shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                {t("editServer.title")}
                <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                  {t("editServer.developerPlus")}
                </span>
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("editServer.lockedDescription")}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="btn-primary">
            <Link to={getUpgradePath()}>
              {isSelfHostedMode()
                ? t("editServer.activateLicense")
                : t("editServer.upgrade")}
              <IconArrowRight className="ml-2 h-3.5 w-auto shrink-0" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              {t("editServer.perVhostHeading")}
            </span>
            {summary && (
              <span className="text-xs text-muted-foreground">{summary}</span>
            )}
          </div>

          {totalCount > 1 && (
            // Broker-wide shortcuts. Each maps to a single `setEnabled` call with
            // no `vhost`; per-vhost switches below still let you trace any subset.
            <div className="flex items-center justify-end gap-2">
              {busyAll && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busyAll || tracedCount === totalCount}
                onClick={() => setAllTracing(true)}
              >
                {t("editServer.enableAllVhosts")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busyAll || tracedCount === 0}
                onClick={() => setAllTracing(false)}
              >
                {t("editServer.disableAllVhosts")}
              </Button>
            </div>
          )}

          {totalCount > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {vhosts.map((v) => {
                const busy = busyVhost === v.name;
                return (
                  <li
                    key={v.name}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span className="inline-flex items-center gap-1.5 truncate font-mono text-sm text-foreground">
                      <IconFolder className="h-3.5 w-auto shrink-0 text-muted-foreground" />
                      {v.name}
                    </span>
                    <div className="flex items-center gap-2.5">
                      {v.tracing ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          {t("editServer.tracingOn")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("empty.firehose.statusInactive")}
                        </span>
                      )}
                      {busy && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={v.tracing}
                        disabled={busy || busyAll}
                        onCheckedChange={(checked) =>
                          setVhostTracing(v.name, checked)
                        }
                        aria-label={t("editServer.toggleTracingAria", {
                          vhost: v.name,
                        })}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {anyTraced ? (
            // Capture payloads — separate, below the list, off by default.
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {t("editServer.capturePayloads")}
                    <span
                      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        captureEnabled
                          ? "border-warning/50 bg-warning-muted text-warning"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {captureEnabled
                        ? t("editServer.payloadsStored")
                        : t("editServer.payloadsOff")}
                    </span>
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {t("editServer.capturePayloadsHint")}
                  </p>
                </div>
                <Switch
                  checked={captureEnabled}
                  disabled={captureBusy}
                  onCheckedChange={setCapture}
                  aria-label={t("editServer.capturePayloads")}
                />
              </div>
              {captureEnabled && (
                <p className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning-muted p-2.5 text-xs leading-relaxed text-foreground">
                  <IconLock
                    className="mt-0.5 h-3.5 w-auto shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <span>{t("editServer.capturePayloadsWarning")}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("editServer.retentionNote")}
              </p>
            </div>
          ) : (
            // No vhost traced — diagnosis has less evidence to work with.
            <div className="border-t border-border pt-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("editServer.noVhostTracedHint")}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
