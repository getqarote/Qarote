import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { BookOpen, Loader2, Sparkles } from "lucide-react";

import { RabbitMQAlertSeverity } from "@/lib/api/alertTypes";
import { getRuleDocUrl } from "@/lib/scan/ruleDocs";

import { getSeverityColor } from "@/components/alerts/alertUtils";
import { ExplanationActions } from "@/components/llm/ExplanationActions";
import { QuotaExceededCard } from "@/components/llm/QuotaExceededCard";
import { QuotaProgressPill } from "@/components/llm/QuotaProgressPill";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useStreamingExplain } from "@/hooks/ui/useStreamingExplain";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

interface Finding {
  id: string;
  ruleKey: string;
  severity: RabbitMQAlertSeverity;
  resourceType: string;
  resourceName: string;
}

interface ScanRevealExplainDrawerProps {
  finding: Finding | null;
  isDemo?: boolean;
  onClose: () => void;
}

export function ScanRevealExplainDrawer({
  finding,
  isDemo,
  onClose,
}: ScanRevealExplainDrawerProps) {
  const { t } = useTranslation(["scan", "alerts"]);
  const { workspace } = useWorkspace();
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
  const titleRef = useRef<HTMLHeadingElement>(null);

  const startStream = useCallback(
    (regenerate = false) => {
      if (!finding || !workspace?.id) return;
      reset();
      stream({
        workspaceId: workspace.id,
        feature: "explain_finding",
        findingId: finding.id,
        regenerate,
      });
    },
    // reset and stream are stable useCallback refs — omitting them is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finding?.id, workspace?.id]
  );

  useEffect(() => {
    if (!finding || !workspace?.id) return;
    startStream();
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finding?.id, workspace?.id]);

  const handleRegenerate = useCallback(() => {
    startStream(true);
  }, [startStream]);

  const { badge } = finding
    ? getSeverityColor(finding.severity)
    : { badge: "" };

  return (
    <Sheet open={!!finding} onOpenChange={(open) => !open && onClose()}>
      {/* SheetContent already renders a PixelX close button (absolute top-right).
          onOpenAutoFocus redirects focus from that button to the title. */}
      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          titleRef.current?.focus();
        }}
      >
        <SheetHeader className="space-y-1 pr-8">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle ref={titleRef} className="text-base" tabIndex={-1}>
              {finding
                ? t(`alerts:ruleLabels.${finding.ruleKey}`, {
                    defaultValue: finding.ruleKey,
                  })
                : null}
            </SheetTitle>
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
                onRegenerate={handleRegenerate}
              />
            </div>
          </div>
          {finding && (
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${badge}`}
              >
                {t(`alerts:rules.severity.${finding.severity.toLowerCase()}`, {
                  defaultValue: finding.severity,
                })}
              </span>
              <code className="text-xs text-muted-foreground">
                {finding.resourceType}/{finding.resourceName}
              </code>
            </div>
          )}
        </SheetHeader>

        <div className="mt-4">
          {quotaExceeded && (
            <QuotaExceededCard
              quota={quotaExceeded}
              feature="explain_finding"
              billingHref="/settings/subscription"
              llmSettingsHref="/settings/llm"
            />
          )}
          {!quotaExceeded && isStreaming && !text && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("explain.loading")}
            </div>
          )}
          {!quotaExceeded && error && !text && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
              {/* "LLM not configured" is a fixable state, not an outage —
                  surface a settings link instead of a generic retry that
                  will keep failing until the operator configures a provider. */}
              {/LLM not configured|llm not configured/i.test(error) ? (
                <>
                  <p className="text-sm text-destructive">
                    {t("explain.llmNotConfigured")}
                  </p>
                  <a
                    href="/settings/llm"
                    className="mt-2 inline-block text-xs text-destructive underline underline-offset-2 hover:no-underline"
                  >
                    {t("explain.configureLlm")}
                  </a>
                </>
              ) : (
                <>
                  <p className="text-sm text-destructive">
                    {t("explain.error")}
                  </p>
                  <button
                    type="button"
                    onClick={() => startStream()}
                    className="mt-2 text-xs text-destructive underline-offset-2 hover:underline"
                  >
                    {t("explain.retry")}
                  </button>
                </>
              )}
            </div>
          )}
          {!quotaExceeded && text && (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {text}
                {isStreaming && (
                  <span className="inline-block w-1 h-3.5 ml-0.5 bg-foreground/70 animate-pulse" />
                )}
              </p>
              {error && (
                <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive">
                    {t("explain.errorPartial")}
                  </p>
                  <button
                    type="button"
                    onClick={() => startStream()}
                    className="mt-1 text-xs text-destructive underline-offset-2 hover:underline"
                  >
                    {t("explain.retry")}
                  </button>
                </div>
              )}
            </>
          )}
          {finding && getRuleDocUrl(finding.ruleKey) && (
            <a
              href={getRuleDocUrl(finding.ruleKey)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <BookOpen className="h-3 w-3" />
              {t("explain.viewDocs")}
            </a>
          )}
          {isDemo && (
            <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
              <Sparkles className="inline h-3 w-3 mr-1" />
              {t("reveal.explainDemoFooter")}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
