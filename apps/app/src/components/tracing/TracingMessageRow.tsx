/**
 * TracingMessageRow
 *
 * Collapsible row for a single MessageTraceEvent. Renders direction badge,
 * timestamp, routing key, exchange, and payload size inline. On expand,
 * shows message properties and a metadata-only notice (payload body is not
 * captured in v1 — payloadBytes reflects the original message size).
 */

import { memo } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDown, ChevronRight } from "lucide-react";

import { formatBytes } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { MessageTraceEvent } from "@/types/tracing";

interface TracingMessageRowProps {
  event: MessageTraceEvent;
}

/** Returns HH:MM:SS.mmm in UTC — consistent with `rabbitmqctl` output. */
function formatTimestamp(isoTimestamp: string): string {
  return new Date(isoTimestamp).toISOString().slice(11, 23);
}

export const TracingMessageRow = memo(function TracingMessageRow({
  event,
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
          {/* Payload — v1 captures metadata only; body is not stored */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase block mb-1.5">
              {t("payload.title")}
            </span>
            <p className="text-xs text-muted-foreground font-mono">
              {t("payload.metadataOnly", {
                size: formatBytes(event.payloadBytes),
              })}
            </p>
          </div>

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
