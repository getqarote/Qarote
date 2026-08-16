import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Ban,
  Check,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { RabbitMQAlertSeverity } from "@/lib/api/alertTypes";

import { getSeverityColor } from "@/components/alerts/alertUtils";
import { ExplanationActions } from "@/components/llm/ExplanationActions";
import { QuotaExceededCard } from "@/components/llm/QuotaExceededCard";
import { QuotaProgressPill } from "@/components/llm/QuotaProgressPill";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import { useStreamingExplain } from "@/hooks/ui/useStreamingExplain";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export interface ScanFinding {
  id: string;
  ruleKey: string;
  severity: string;
  resourceType: string;
  resourceName: string;
  vhost?: string;
  detectedAt: string;
  resolvedAt?: string;
  dismissedAt?: string;
  dismissReason?: string;
}

interface FindingDetailDrawerProps {
  finding: ScanFinding | null;
  serverName: string;
  pending: boolean;
  rescanning: boolean;
  onClose: () => void;
  onResolve: (id: string) => void;
  onDismiss: (id: string, reason?: string) => void;
  onRescan: () => void;
}

const DISMISS_REASONS = [
  "byDesign",
  "acceptableRisk",
  "falsePositive",
  "handledElsewhere",
] as const;

export function FindingDetailDrawer({
  finding,
  serverName,
  pending,
  rescanning,
  onClose,
  onResolve,
  onDismiss,
  onRescan,
}: FindingDetailDrawerProps) {
  const { t } = useTranslation("alerts");
  const { workspace } = useWorkspace();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [explaining, setExplaining] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason] = useState("");

  const {
    text,
    isStreaming,
    error,
    explanationId,
    quotaExceeded,
    quotaStatus,
    stream,
    reset,
  } = useStreamingExplain();

  const findingId = finding?.id;

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

  // Reset transient UI each time a different finding opens.
  useEffect(() => {
    setExplaining(false);
    setDismissing(false);
    setReason("");
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finding?.id]);

  useEffect(() => {
    if (explaining) startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explaining]);

  if (!finding) return null;

  const status = finding.resolvedAt
    ? "resolved"
    : finding.dismissedAt
      ? "dismissed"
      : "open";
  const severity = finding.severity as RabbitMQAlertSeverity;
  const { badge, dot } = getSeverityColor(severity);
  const label = t(`ruleLabels.${finding.ruleKey}`, {
    defaultValue: finding.ruleKey,
  });
  const what = t(`ruleGuidance.${finding.ruleKey}.what`, {
    defaultValue: "",
    resource: finding.resourceName,
    vhost: finding.vhost ?? "/",
  });
  const fixTitle = t(`ruleGuidance.${finding.ruleKey}.fixTitle`, {
    defaultValue: "",
  });
  const fixSteps = t(`ruleGuidance.${finding.ruleKey}.fixSteps`, {
    returnObjects: true,
    defaultValue: [],
  }) as string[];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[540px]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          titleRef.current?.focus();
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-4 pr-12">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="font-heading text-base font-semibold text-foreground outline-none"
          >
            {t("scan.configFinding")}
          </h2>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {status === "resolved" && (
            <div className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("scan.banner.resolved")}
            </div>
          )}
          {status === "dismissed" && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {finding.dismissReason
                ? t("scan.banner.dismissedWithReason", {
                    reason: finding.dismissReason,
                  })
                : t("scan.banner.dismissed")}
            </div>
          )}

          {/* Rule head */}
          <div className="flex items-start gap-3">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] ${badge}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-foreground">
                {label}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {finding.ruleKey}
              </div>
            </div>
            <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-xs capitalize text-muted-foreground">
              {t(`sevLabel.${finding.severity.toLowerCase()}`, {
                defaultValue: finding.severity,
              })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <span>{finding.resourceType}</span>
            <code className="text-accent-foreground">
              {finding.resourceName}
            </code>
            <span className="opacity-50">·</span>
            <span>{serverName}</span>
            <span className="opacity-50">·</span>
            <span>{finding.vhost ?? "/"}</span>
          </div>

          {/* What & why */}
          {what && (
            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("scan.whatWhy")}
              </h3>
              <p className="text-sm leading-relaxed text-foreground/80">
                {what}
              </p>
            </section>
          )}

          {/* Explain (AI) */}
          <div aria-live="polite">
            {!explaining ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setExplaining(true)}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("scan.explainThis")}
              </Button>
            ) : (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">
                    ✦ {t("scan.aiExplanation")}
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
                ) : error && !text ? (
                  <p className="text-sm text-destructive">
                    {t("detail.rcaError")}
                  </p>
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

          {/* How to fix */}
          {fixTitle && (
            <section className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {fixTitle}
                </span>
                <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {t("scan.ruleGuidance")}
                </span>
              </div>
              {fixSteps.length > 0 && (
                <ol className="list-decimal space-y-1.5 px-4 py-3 pl-9 text-sm text-foreground/80 marker:text-muted-foreground">
                  {fixSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
              <div className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("scan.noAutoFix")}
              </div>
            </section>
          )}

          {/* Dismiss-with-reason inline form */}
          {dismissing && (
            <section className="space-y-2 rounded-lg border border-border bg-card p-4">
              <label
                htmlFor="finding-dismiss-reason"
                className="text-xs font-medium text-foreground"
              >
                {t("scan.dismissReasonLabel")}
              </label>
              <select
                id="finding-dismiss-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="">{t("scan.dismissReasonSelect")}</option>
                {DISMISS_REASONS.map((r) => (
                  <option key={r} value={t(`scan.dismissReasons.${r}`)}>
                    {t(`scan.dismissReasons.${r}`)}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDismissing(false)}
                >
                  {t("scan.cancel")}
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={pending}
                  onClick={() => onDismiss(finding.id, reason || undefined)}
                >
                  {t("scan.dismissConfirm")}
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* Action bar — open findings only */}
        {status === "open" && !dismissing && (
          <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={rescanning}
              onClick={onRescan}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${rescanning ? "animate-spin" : ""}`}
              />
              {rescanning ? t("scan.scanning") : t("scan.rescan")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setDismissing(true)}
            >
              {t("scan.dismissAction")}
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              disabled={pending}
              onClick={() => onResolve(finding.id)}
            >
              {t("scan.markResolved")}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
