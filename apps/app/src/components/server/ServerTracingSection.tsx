/**
 * Message tracing (firehose) activation — migrated here from the now-hidden
 * Messages page. The firehose feeds the LLM diagnosis layer, so its enable
 * control must stay reachable: it lives in the Edit Server form.
 *
 * Three states: not-entitled (locked → upgrade), entitled + inactive
 * (per-vhost status + Enable with confirm), entitled + active (enabled).
 * Retention is a fixed 7 days (no knob). Gated on `message_tracing`.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { toast } from "sonner";

import { getUpgradePath } from "@/lib/featureFlags";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alertDialog";
import { Button } from "@/components/ui/button";

import {
  useFirehoseStatus,
  useSetTraceEnabled,
} from "@/hooks/queries/useMessageRecording";
import { useWorkspace } from "@/hooks/ui/useWorkspace";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export function ServerTracingSection({ serverId }: { serverId: string }) {
  const { t } = useTranslation("tracing");
  const { hasFeature } = useFeatureFlags();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  const entitled = hasFeature("message_tracing");
  const status = useFirehoseStatus(serverId, entitled);
  const setTrace = useSetTraceEnabled();
  const [enabling, setEnabling] = useState(false);

  const vhosts = status.data?.vhosts ?? [];
  const active = status.data?.active ?? false;

  const handleEnable = async () => {
    if (!workspaceId || !serverId) return;
    setEnabling(true);
    try {
      const res = await setTrace.mutateAsync({
        serverId,
        workspaceId,
        enabled: true,
      });
      await status.refetch();
      if (res?.failedVhosts?.length) {
        toast.warning(
          t("editServer.partialEnabled", {
            count: res.failedVhosts.length,
          })
        );
      } else {
        toast.success(t("editServer.enabled"));
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("empty.firehose.enableError")
      );
    } finally {
      setEnabling(false);
    }
  };

  return (
    <section className="space-y-3 border-t border-border pt-5">
      <div>
        <h3 className="text-sm font-semibold">{t("editServer.title")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("editServer.description")}
        </p>
      </div>

      {!entitled ? (
        <Link
          to={getUpgradePath()}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("editServer.locked")}
        </Link>
      ) : (
        <>
          {vhosts.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {vhosts.map((v) => (
                <li
                  key={v.name}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="font-mono text-sm">{v.name}</span>
                  {v.tracing ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("empty.firehose.statusActive")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <XCircle className="h-3.5 w-3.5" />
                      {t("empty.firehose.statusInactive")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {active ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("editServer.enabledNote")}
            </p>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" size="sm" disabled={enabling}>
                  {enabling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {enabling
                    ? t("empty.firehose.enabling")
                    : t("empty.firehose.enable")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("empty.firehose.confirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("empty.firehose.confirmDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">
                    {t("empty.firehose.confirmCancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    type="button"
                    onClick={handleEnable}
                    aria-busy={enabling}
                  >
                    {t("empty.firehose.confirmProceed")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      )}
    </section>
  );
}
