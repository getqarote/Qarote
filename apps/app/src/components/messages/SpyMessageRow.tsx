import { memo } from "react";
import { useTranslation } from "react-i18next";

import { ChevronDown, ChevronRight } from "lucide-react";

import { PayloadViewer } from "@/components/tracing/PayloadViewer";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { SpyMessage } from "@/hooks/queries/useRabbitMQ";

function formatTimestamp(isoTimestamp: string): string {
  // Absolute time in HH:MM:SS.mmm form. Rows are memoized, so a relative
  // time label (e.g. "5s ago") would never update after the first render —
  // absolute timestamps are also more useful for correlating with logs.
  const d = new Date(isoTimestamp);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SpyMessageRowProps {
  message: SpyMessage;
}

export const SpyMessageRow = memo(function SpyMessageRow({
  message,
}: SpyMessageRowProps) {
  const { t } = useTranslation("queues");

  const truncatedPayload =
    message.payload.length > 80
      ? `${message.payload.slice(0, 80)}...`
      : message.payload;

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/50 group"
        >
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 group-data-[state=open]:hidden" />
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 hidden group-data-[state=open]:block" />

          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {formatTimestamp(message.timestamp)}
          </span>

          {message.exchange && (
            <Badge variant="outline" className="text-xs shrink-0">
              {message.exchange}
            </Badge>
          )}

          <Badge variant="secondary" className="text-xs shrink-0">
            {message.routingKey || t("spyEmpty")}
          </Badge>

          {message.redelivered && (
            <Badge variant="destructive" className="text-xs shrink-0">
              {t("spyRedelivered")}
            </Badge>
          )}

          <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
            {message.isBinary
              ? `[binary ${formatBytes(message.payloadBytes)}]`
              : truncatedPayload}
          </span>

          <span className="text-xs text-muted-foreground shrink-0">
            {formatBytes(message.payloadBytes)}
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 py-3 bg-muted/30 border-b border-border/50 space-y-3">
          {/* Payload — rendered by shared PayloadViewer */}
          <PayloadViewer
            payload={message.payload}
            isBinary={message.isBinary}
            truncated={message.truncated}
            payloadBytes={message.payloadBytes}
          />

          {/* Headers */}
          {Object.keys(message.headers).length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">
                {t("spyHeaders")}
              </span>
              <div className="text-xs font-mono bg-muted p-2 rounded-md space-y-1">
                {Object.entries(message.headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {key}:
                    </span>
                    <span className="text-foreground break-all">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Properties */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">
              {t("spyProperties")}
            </span>
            <div className="text-xs font-mono bg-muted p-2 rounded-md grid grid-cols-2 gap-1">
              {message.contentType && (
                <>
                  <span className="text-muted-foreground">content-type:</span>
                  <span className="text-foreground">{message.contentType}</span>
                </>
              )}
              {message.messageId && (
                <>
                  <span className="text-muted-foreground">message-id:</span>
                  <span className="text-foreground break-all">
                    {message.messageId}
                  </span>
                </>
              )}
              {message.correlationId && (
                <>
                  <span className="text-muted-foreground">correlation-id:</span>
                  <span className="text-foreground break-all">
                    {message.correlationId}
                  </span>
                </>
              )}
              {message.appId && (
                <>
                  <span className="text-muted-foreground">app-id:</span>
                  <span className="text-foreground">{message.appId}</span>
                </>
              )}
              <span className="text-muted-foreground">exchange:</span>
              <span className="text-foreground">
                {message.exchange || t("spyDefaultExchange")}
              </span>
              <span className="text-muted-foreground">routing-key:</span>
              <span className="text-foreground">
                {message.routingKey || t("spyEmpty")}
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
