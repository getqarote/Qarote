import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, Clock, Loader2, RotateCcw, Sparkles } from "lucide-react";

import {
  getSeverityAccent,
  getSeverityColor,
} from "@/components/alerts/alertUtils";
import { ExplanationActions } from "@/components/llm/ExplanationActions";
import { QuotaExceededCard } from "@/components/llm/QuotaExceededCard";
import { QuotaProgressPill } from "@/components/llm/QuotaProgressPill";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useStreamingExplain } from "@/hooks/ui/useStreamingExplain";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { type AlertVM } from "./alertViewModel";

/** Snooze presets the backend accepts (1h / 4h / 24h "until tomorrow"). */
const SNOOZE_OPTIONS = ["1h", "4h", "24h"] as const;
export type SnoozeDuration = (typeof SNOOZE_OPTIONS)[number];

export type AlertAction = "claim" | "resolve" | "reopen" | "snooze";

interface AlertDetailDrawerProps {
  alert: AlertVM | null;
  canManage: boolean;
  pending: boolean;
  onClose: () => void;
  onAction: (
    id: string,
    action: AlertAction,
    duration?: SnoozeDuration
  ) => void;
}

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtDuration(ms?: number, fallback?: string): string {
  if (ms == null) return fallback ?? "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

export function AlertDetailDrawer({
  alert,
  canManage,
  pending,
  onClose,
  onAction,
}: AlertDetailDrawerProps) {
  const { t } = useTranslation("alerts");
  const { workspace } = useWorkspace();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [explaining, setExplaining] = useState(false);

  const {
    text,
    isStreaming,
    explanationId,
    quotaExceeded,
    quotaStatus,
    stream,
    reset,
  } = useStreamingExplain();

  const findingId = alert?.findingId;

  const startStream = useCallback(
    (regenerate = false) => {
      if (!findingId || !workspace?.id) return;
      reset();
      stream({
        workspaceId: workspace.id,
        feature: "explain_finding",
        findingId,
        regenerate,
      });
    },
    // reset/stream are stable refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [findingId, workspace?.id]
  );

  // Each time a different alert opens, collapse the explanation back to its CTA.
  useEffect(() => {
    setExplaining(false);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alert?.id]);

  useEffect(() => {
    if (explaining) startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explaining]);

  if (!alert) return null;

  const accent = getSeverityAccent(alert.severity);
  const { badge } = getSeverityColor(alert.severity);
  const sevLabel = t(`sevLabel.${alert.severity.toLowerCase()}`);
  const statusKey =
    alert.status === "ack"
      ? "ack"
      : alert.status === "resolved"
        ? "resolved"
        : "active";

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[540px]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          titleRef.current?.focus();
        }}
      >
        {/* Header — severity top accent + title */}
        <div
          className={`border-t-[3px] ${accent.border} border-t-current px-5 pb-4 pt-5 ${accent.text}`}
        >
          <div className="flex items-start justify-between gap-3 pr-8">
            <h2
              ref={titleRef}
              tabIndex={-1}
              className="font-heading text-base font-semibold leading-tight text-foreground outline-none"
            >
              <span
                className={`mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle ${accent.bg}`}
                aria-hidden="true"
              />
              {alert.title}
            </h2>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${badge}`}
            >
              {t(`status.${statusKey}`)}
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              {sevLabel}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed text-foreground/80">
            {alert.description}
          </p>

          {/* Explain — only when the alert maps to a diagnosable finding */}
          {findingId && alert.status !== "resolved" && (
            <div aria-live="polite">
              {!explaining ? (
                <button
                  type="button"
                  onClick={() => setExplaining(true)}
                  className="flex w-full items-start gap-3 rounded-lg border border-primary/30 bg-accent p-3 text-left transition-colors hover:border-primary/50 dark:bg-primary/10"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-foreground/80">
                    <b className="font-semibold text-foreground">
                      {t("detail.explainTitle")}
                    </b>{" "}
                    {t("detail.explainHint")}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-primary">
                    {t("item.explain")}
                  </span>
                </button>
              ) : (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
                      ✦ {t("detail.rca")}
                    </span>
                    <div className="flex items-center gap-2">
                      {workspace?.id && (
                        <QuotaProgressPill
                          quota={quotaStatus}
                          workspaceId={workspace.id}
                          feature="explain_finding"
                        />
                      )}
                      <ExplanationActions
                        explanationId={explanationId}
                        content={text}
                        disabled={isStreaming || !!quotaExceeded}
                        feature="explain_finding"
                        onRegenerate={() => startStream(true)}
                      />
                    </div>
                  </div>
                  {quotaExceeded ? (
                    <QuotaExceededCard
                      quota={quotaExceeded}
                      feature="explain_finding"
                      billingHref="/settings/subscription"
                      llmSettingsHref="/settings/llm"
                    />
                  ) : isStreaming && !text ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("detail.rcaLoading")}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {text}
                      {isStreaming && (
                        <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-foreground/70 align-middle" />
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Source */}
          <section className="space-y-2 border-b border-border pb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail.source")}
            </h3>
            <KV label={t("detail.server")} value={alert.serverName} />
            <KV
              label={t("detail.queueVhost")}
              value={`${alert.resource} · ${alert.vhost}`}
              mono
            />
          </section>

          {/* Threshold vs actual — only when we have a threshold */}
          {alert.details.threshold != null && (
            <section className="space-y-2 border-b border-border pb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("detail.thresholdVsActual")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("item.detail.threshold")}
                  </div>
                  <div className="mt-1 font-mono text-sm text-foreground">
                    {alert.details.threshold}
                  </div>
                </div>
                <div
                  className={`rounded-md border border-border bg-muted/40 p-3`}
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("detail.actual")}
                  </div>
                  <div className={`mt-1 font-mono text-sm ${accent.text}`}>
                    {alert.details.current ?? "—"}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Timeline */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail.timeline")}
            </h3>
            <ol className="space-y-2.5">
              <TL
                label={t("timeline.firstSeen")}
                time={fmtTime(alert.firstSeen)}
              />
              {alert.acknowledgedAt && (
                <TL
                  label={t("timeline.claimed")}
                  time={fmtTime(alert.acknowledgedAt)}
                />
              )}
              {alert.resolvedAt && (
                <TL
                  label={t("timeline.resolved")}
                  time={`${fmtTime(alert.resolvedAt)} · ${fmtDuration(alert.durationMs)}`}
                />
              )}
              {alert.status !== "resolved" && (
                <TL
                  label={t("timeline.lastSeen")}
                  time={fmtTime(alert.lastSeen)}
                  muted
                />
              )}
            </ol>
          </section>
        </div>

        {/* Action bar */}
        {canManage && (
          <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-5 py-3">
            {alert.status === "resolved" ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {t("timeline.resolved")} · {fmtTime(alert.resolvedAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto gap-1"
                  disabled={pending}
                  onClick={() => onAction(alert.id, "reopen")}
                  title={t("lifecycle.reopenTooltip")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("lifecycle.reopen")}
                </Button>
              </>
            ) : (
              <>
                {alert.status === "active" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        disabled={pending}
                        onClick={() => onAction(alert.id, "claim")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("lifecycle.acknowledge")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("lifecycle.claimTooltip")}
                    </TooltipContent>
                  </Tooltip>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                      disabled={pending}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {t("lifecycle.snoozeForLabel")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {SNOOZE_OPTIONS.map((d) => (
                      <DropdownMenuItem
                        key={d}
                        onClick={() => onAction(alert.id, "snooze", d)}
                      >
                        {t(`lifecycle.snoozeFor.${d}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={pending}
                  onClick={() => onAction(alert.id, "resolve")}
                  title={t("lifecycle.resolveTooltip")}
                >
                  {t("lifecycle.resolve")}
                </Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={`min-w-0 truncate text-right text-foreground ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function TL({
  label,
  time,
  muted,
}: {
  label: string;
  time: string;
  muted?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${muted ? "bg-muted-foreground/40" : "bg-foreground/50"}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {time}
        </div>
      </div>
    </li>
  );
}
