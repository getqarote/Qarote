/**
 * TracingMessageRow
 *
 * Collapsible row for a single MessageTraceEvent. Renders direction badge,
 * timestamp, routing key, exchange, and payload size inline. On expand,
 * shows message properties and a metadata-only notice (payload body is not
 * captured in v1 — payloadBytes reflects the original message size).
 */

import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  buildTraceMessages,
  TRACE_PROMPT_VERSION,
} from "@api/ee/services/llm/context-builders/trace.context";
import { usePostHog } from "@posthog/react";
import DOMPurify from "dompurify";
import {
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { marked } from "marked";

import { formatBytes } from "@/lib/utils";

import { ExplanationActions } from "@/components/llm/ExplanationActions";
import { QuotaExceededCard } from "@/components/llm/QuotaExceededCard";
import { QuotaProgressPill } from "@/components/llm/QuotaProgressPill";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useStreamingExplain } from "@/hooks/ui/useStreamingExplain";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { UserPlan } from "@/types/plans";
import type { MessageTraceEvent } from "@/types/tracing";

interface TracingMessageRowProps {
  event: MessageTraceEvent;
  defaultExplainOpen?: boolean;
}

/** Returns HH:MM:SS.mmm in UTC — consistent with `rabbitmqctl` output. */
function formatTimestamp(isoTimestamp: string): string {
  return new Date(isoTimestamp).toISOString().slice(11, 23);
}

const DOMPURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "blockquote",
    "h3",
  ],
  ALLOWED_ATTR: [],
};

function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(
    marked.parse(text, { async: false }),
    DOMPURIFY_CONFIG
  );
}

/**
 * Separate component so that stream state and AbortController are tied to the
 * CollapsibleContent lifecycle — unmounting (row collapse) aborts the stream.
 */
function TraceExplainSection({
  event,
  defaultExplainOpen = false,
}: {
  event: MessageTraceEvent;
  defaultExplainOpen?: boolean;
}) {
  const { t } = useTranslation("tracing");
  const posthog = usePostHog();
  const { userPlan } = useUser();
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
  const [explainOpen, setExplainOpen] = useState(defaultExplainOpen);

  const canExplain =
    userPlan === UserPlan.DEVELOPER || userPlan === UserPlan.ENTERPRISE;
  const workspaceId = workspace?.id;

  // Memoize so the effect re-runs whenever ANY publisher-controlled field
  // changes (the previous deps list omitted exchange/vhost/contentType/etc.
  // and could yield a stale explanation).
  const explainMessages = useMemo(
    () =>
      buildTraceMessages({
        direction: event.direction,
        exchange: event.exchange,
        routingKey: event.routingKey,
        queueName: event.queueName,
        vhost: event.vhost,
        payloadBytes: event.payloadBytes,
        contentType: event.contentType,
        messageId: event.messageId,
        timestamp: event.timestamp,
      }),
    [
      event.direction,
      event.exchange,
      event.routingKey,
      event.queueName,
      event.vhost,
      event.payloadBytes,
      event.contentType,
      event.messageId,
      event.timestamp,
    ]
  );

  useEffect(() => {
    if (!explainOpen || !workspaceId) return;
    void stream({
      workspaceId,
      feature: "explain_trace",
      promptVersion: TRACE_PROMPT_VERSION,
      messages: explainMessages,
    });
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainOpen, workspaceId, explainMessages]);

  if (!canExplain) return null;

  const handleExplainClick = () => {
    if (!explainOpen && posthog) {
      posthog.capture("llm_explain_requested", {
        feature: "explain_trace",
        direction: event.direction,
        exchange: event.exchange,
        routingKey: event.routingKey,
        vhost: event.vhost,
      });
    }
    // Closing the panel: cancel any in-flight stream so the user isn't
    // billed for tokens they will never see.
    if (explainOpen) reset();
    setExplainOpen((v) => !v);
  };

  const startStream = (regenerate = false) => {
    if (workspaceId) {
      void stream({
        workspaceId,
        feature: "explain_trace",
        promptVersion: TRACE_PROMPT_VERSION,
        messages: explainMessages,
        regenerate,
      });
    }
  };

  return (
    <div className="space-y-2 pt-1">
      <button
        type="button"
        onClick={handleExplainClick}
        // Stay clickable while streaming so the user can close/cancel
        // the panel mid-stream. Only block when the panel is closed.
        disabled={isStreaming && !explainOpen}
        aria-expanded={explainOpen}
        aria-label={`${t("explain.button")} ${event.direction} ${event.routingKey || event.queueName || ""}`}
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border transition-colors ${
          explainOpen
            ? "bg-primary/20 border-primary/40 text-primary"
            : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/40"
        } disabled:opacity-50`}
      >
        {isStreaming ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : explainOpen ? (
          <X className="h-3 w-3" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {t("explain.button")}
      </button>

      {explainOpen && (
        <div className="rounded-md border border-border bg-muted/30">
          {/* Actions bar — visible when there's content, an error, or an at-cap state */}
          {(text || error || quotaExceeded) && (
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-border/50">
              {workspaceId ? (
                <QuotaProgressPill
                  quota={quotaStatus}
                  workspaceId={workspaceId}
                  feature="explain_trace"
                />
              ) : (
                <span />
              )}
              <ExplanationActions
                explanationId={explanationId}
                content={text}
                disabled={isStreaming || !!quotaExceeded}
                feature="explain_trace"
                onRegenerate={() => startStream(true)}
              />
            </div>
          )}
          <div className="px-4 py-3">
            {quotaExceeded ? (
              <QuotaExceededCard
                quota={quotaExceeded}
                feature="explain_trace"
                billingHref="/settings/subscription"
                llmSettingsHref="/settings/llm"
              />
            ) : error ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={() => startStream()}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {t("explain.retry")}
                </button>
              </div>
            ) : !text && isStreaming ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("explain.explaining")}
              </div>
            ) : text ? (
              <div
                className="text-sm text-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_code]:font-mono [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export const TracingMessageRow = memo(function TracingMessageRow({
  event,
  defaultExplainOpen,
}: TracingMessageRowProps) {
  const { t } = useTranslation("tracing");

  const isPublish = event.direction === "publish";

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors border-b border-border/50 group"
        >
          <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0 group-data-[state=open]:hidden" />
          <ChevronDown className="w-3 h-3 text-muted-foreground/60 shrink-0 hidden group-data-[state=open]:block" />

          {/* Timestamp — Fragment Mono, fixed width so rows align */}
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap shrink-0 tabular-nums w-[88px]">
            {formatTimestamp(event.timestamp)}
          </span>

          {/* Direction — semantic color: publish = info, deliver = success */}
          <span
            className={`inline-flex items-center shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
              isPublish
                ? "bg-info-muted text-info"
                : "bg-success-muted text-success"
            }`}
          >
            {isPublish
              ? t("filter.direction.publish")
              : t("filter.direction.deliver")}
          </span>

          {/* Exchange — mono, only when present */}
          {event.exchange && (
            <span className="text-xs font-mono text-muted-foreground shrink-0 max-w-[140px] truncate">
              {event.exchange}
            </span>
          )}

          {/* Routing key / queue name — mono, primary identifier */}
          <span className="text-xs font-mono text-foreground shrink-0 max-w-[200px] truncate">
            {event.routingKey || event.queueName || "—"}
          </span>

          {/* Payload size — mono, right-aligned */}
          <span className="text-xs font-mono text-muted-foreground ml-auto shrink-0 tabular-nums">
            {formatBytes(event.payloadBytes)}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 py-3 bg-muted/20 border-b border-border/50 space-y-3">
          {/* Tracing stores metadata only — surface this on every expanded
              row so users don't wonder why there's no payload tab. The
              i18n key existed since v1 but was never rendered. */}
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info
              className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/70"
              aria-hidden
            />
            <span>
              {t("payload.metadataOnly", {
                size: formatBytes(event.payloadBytes),
              })}
            </span>
          </p>

          {/* LLM explain — top position for discoverability; Developer/Enterprise only */}
          <TraceExplainSection
            event={event}
            defaultExplainOpen={defaultExplainOpen}
          />

          {/* Properties — definition list for better semantics */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase block mb-2">
              {t("properties.title")}
            </span>
            <dl className="text-xs font-mono bg-muted/50 px-3 py-2 rounded-md grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">{t("properties.vhost")}</dt>
              <dd className="text-foreground">{event.vhost}</dd>

              <dt className="text-muted-foreground">
                {t("properties.exchange")}
              </dt>
              <dd className="text-foreground">{event.exchange || "—"}</dd>

              <dt className="text-muted-foreground">
                {t("properties.routingKey")}
              </dt>
              <dd className="text-foreground">{event.routingKey || "—"}</dd>

              {event.queueName && (
                <>
                  <dt className="text-muted-foreground">
                    {t("properties.queue")}
                  </dt>
                  <dd className="text-foreground">{event.queueName}</dd>
                </>
              )}

              {event.contentType && (
                <>
                  <dt className="text-muted-foreground">
                    {t("properties.contentType")}
                  </dt>
                  <dd className="text-foreground">{event.contentType}</dd>
                </>
              )}

              {event.messageId && (
                <>
                  <dt className="text-muted-foreground">
                    {t("properties.messageId")}
                  </dt>
                  <dd className="text-foreground break-all">
                    {event.messageId}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
