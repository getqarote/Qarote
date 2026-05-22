/**
 * TracingDisabledState
 *
 * Shown when the user has an Enterprise license but the RabbitMQ Firehose
 * is inactive on the broker. Distinct from UpgradePrompt (no license).
 *
 * Lists per-vhost tracing status, offers an "Enable Tracing" CTA gated by
 * a confirmation dialog that surfaces the broker overhead and the
 * best-effort capture model. A Spy alternative link is offered for users
 * who only need to inspect one queue without enabling Tracing globally.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";

import { TRACING_VS_SPY_DOCS_URL } from "@/lib/docsUrls";

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

interface TracingDisabledStateProps {
  vhosts: VhostTracingStatus[];
  onEnable: () => Promise<void>;
  isEnabling?: boolean;
}

export function TracingDisabledState({
  vhosts,
  onEnable,
  isEnabling = false,
}: TracingDisabledStateProps) {
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
    <div className="px-6 py-12 max-w-lg mx-auto">
      {/* Heading + honest description */}
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
              {/* Footer mixes the difference link (left) with the
                  confirm/cancel pair (right) so users who landed here by
                  mistake can pivot to Spy instead of forcing the broker
                  config change. */}
              <AlertDialogFooter className="sm:justify-between">
                <a
                  href={TRACING_VS_SPY_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {t("docs.confirmDifferenceLink")}
                  <ExternalLink className="w-3 h-3" aria-hidden />
                </a>
                <div className="flex gap-2">
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
                </div>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground">
            {t("empty.firehose.orManually")}{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
              {(() => {
                // Shell-quote so the snippet is safe to paste even when the
                // vhost name contains spaces, /, or embedded single quotes.
                const raw = vhosts.find((v) => !v.tracing)?.name ?? "/";
                const quoted = `'${raw.replaceAll("'", "'\\''")}'`;
                return `rabbitmqctl trace_on -p ${quoted}`;
              })()}
            </code>
          </p>
        </div>
      </div>

      {/* Spy alternative — for users who only need to inspect one queue
          and don't want to enable Tracing broker-wide. */}
      <div className="mt-10 pt-6 border-t border-border flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">
          {t("docs.spyAlternativeIntro")}
        </span>
        <a
          href={TRACING_VS_SPY_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline shrink-0"
        >
          {t("docs.spyAlternativeLink")}
        </a>
      </div>
    </div>
  );
}
