/**
 * FirehoseDisabledState
 *
 * Shown when the user has an Enterprise license but the RabbitMQ Firehose
 * is inactive on the broker. Distinct from UpgradePrompt (no license).
 *
 * Shows per-vhost tracing status and an "Enable tracing" button that calls
 * setTraceEnabled via tRPC. Enable action is guarded by a confirmation dialog
 * that surfaces the performance impact before mutating the broker.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

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

import type { VhostTracingStatus } from "@/types/tracing";

interface FirehoseDisabledStateProps {
  vhosts: VhostTracingStatus[];
  onEnable: () => Promise<void>;
  isEnabling?: boolean;
}

export function FirehoseDisabledState({
  vhosts,
  onEnable,
  isEnabling = false,
}: FirehoseDisabledStateProps) {
  const { t } = useTranslation("tracing");
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const handleConfirmedEnable = async () => {
    setError(null);
    setSucceeded(false);
    try {
      await onEnable();
      setSucceeded(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("empty.firehose.enableError")
      );
    }
  };

  return (
    <div className="px-6 py-12 max-w-lg">
      {/* Heading — no icon-in-circle, just direct text */}
      <h3 className="title-section mb-1">{t("empty.firehose.title")}</h3>
      <p className="text-sm text-muted-foreground mb-8">
        {t("empty.firehose.description")}
      </p>

      {/* Per-vhost status — the data engineers actually care about */}
      {vhosts.length > 0 && (
        <div className="mb-8">
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase block mb-2">
            {t("empty.firehose.vhostStatus")}
          </span>
          <div className="rounded-md border border-border divide-y divide-border">
            {vhosts.map((v) => (
              <div
                key={v.name}
                className="flex items-center justify-between px-3 py-2.5"
              >
                <span className="text-sm font-mono text-foreground">
                  {v.name}
                </span>
                {v.tracing ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("empty.firehose.statusActive")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <XCircle className="w-3.5 h-3.5" />
                    {t("empty.firehose.statusInactive")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success state */}
      {succeeded && (
        <p className="text-sm text-success mb-4 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {t("empty.firehose.enabledSuccess")}
        </p>
      )}

      {/* CTA */}
      <div className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isEnabling || succeeded}>
                {isEnabling && (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                )}
                {isEnabling
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
                <AlertDialogCancel>
                  {t("empty.firehose.confirmCancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmedEnable}
                  aria-busy={isEnabling}
                >
                  {isEnabling ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : null}
                  {t("empty.firehose.confirmProceed")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground">
            {t("empty.firehose.orManually")}{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
              {(() => {
                // Shell-quote so the snippet is safe to paste even when the
                // vhost name contains spaces, /, or embedded single quotes.
                // POSIX single-quote escaping: replace each ' with '\'' then
                // wrap the whole string in single quotes.
                const raw = vhosts.find((v) => !v.tracing)?.name ?? "/";
                const quoted = `'${raw.replaceAll("'", "'\\''")}'`;
                return `rabbitmqctl trace_on -p ${quoted}`;
              })()}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
