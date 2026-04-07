import { memo, type MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";

import { copyToClipboard } from "@/lib/clipboard";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import type { SpyMessage } from "@/hooks/queries/useRabbitMQ";

function formatRelativeTime(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  if (diff < 1000) return "now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function formatPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(message.payload);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            {formatRelativeTime(message.timestamp)}
          </span>

          {message.exchange && (
            <Badge variant="outline" className="text-xs shrink-0">
              {message.exchange}
            </Badge>
          )}

          <Badge variant="secondary" className="text-xs shrink-0">
            {message.routingKey || "(empty)"}
          </Badge>

          {message.redelivered && (
            <Badge variant="destructive" className="text-xs shrink-0">
              redelivered
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
          {/* Payload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {t("spyPayload")}
              </span>
              <div className="flex items-center gap-2">
                {message.truncated && (
                  <Badge variant="outline" className="text-xs">
                    {t("spyTruncated")}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      {t("spyCopied")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      {t("spyCopyPayload")}
                    </>
                  )}
                </Button>
              </div>
            </div>
            <pre className="text-xs font-mono bg-muted text-muted-foreground p-3 rounded-md overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
              {message.isBinary
                ? message.payload
                : formatPayload(message.payload)}
            </pre>
          </div>

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
                {message.exchange || "(default)"}
              </span>
              <span className="text-muted-foreground">routing-key:</span>
              <span className="text-foreground">
                {message.routingKey || "(empty)"}
              </span>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
