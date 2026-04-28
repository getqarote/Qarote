/**
 * PayloadViewer
 *
 * Renders a message payload with two tabs: Formatted JSON and Raw text.
 * Extracted from SpyMessageRow.formatPayload() so it can be shared between
 * QueueSpy and the Tracing page.
 *
 * Note: Hex dump is deferred to post-v1. The payload on the client is a JS
 * string — there is no raw Buffer available; adding hex requires a backend
 * change to send a hex-encoded field.
 */

import {
  memo,
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { Check, Copy } from "lucide-react";

import { copyToClipboard } from "@/lib/clipboard";
import { formatBytes } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PayloadViewerProps {
  payload: string;
  isBinary: boolean;
  truncated: boolean;
  payloadBytes: number;
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export const PayloadViewer = memo(function PayloadViewer({
  payload,
  isBinary,
  truncated,
  payloadBytes,
}: PayloadViewerProps) {
  const { t } = useTranslation("tracing");
  const [tab, setTab] = useState<"json" | "raw">("json");
  const [copied, setCopied] = useState(false);
  const panelId = useId();
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(payload);
    if (success) {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 2000);
    }
  };

  const displayContent = isBinary
    ? `[binary ${formatBytes(payloadBytes)}]`
    : tab === "json"
      ? formatJson(payload)
      : payload;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
            {t("payload.title")}
          </span>
          {!isBinary && (
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "json" | "raw")}
            >
              <TabsList
                aria-label={t("payload.title")}
                className="h-auto gap-0 rounded border border-border bg-transparent p-0 overflow-hidden"
              >
                <TabsTrigger
                  value="json"
                  aria-controls={`${panelId}-panel`}
                  className="rounded-none px-2 py-0.5 text-[11px] shadow-none data-[state=active]:bg-muted data-[state=active]:shadow-none"
                >
                  {t("payload.json")}
                </TabsTrigger>
                <TabsTrigger
                  value="raw"
                  aria-controls={`${panelId}-panel`}
                  className="rounded-none px-2 py-0.5 text-[11px] shadow-none data-[state=active]:bg-muted data-[state=active]:shadow-none"
                >
                  {t("payload.raw")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {truncated && (
            <span className="text-[11px] text-muted-foreground">
              {t("payload.truncated")}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              {t("payload.copied")}
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              {t("payload.copy")}
            </>
          )}
        </Button>
      </div>
      <pre
        id={`${panelId}-panel`}
        role="tabpanel"
        className="text-xs font-mono bg-muted/50 text-muted-foreground px-3 py-2.5 rounded-md overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all leading-5"
      >
        {displayContent}
      </pre>
    </div>
  );
});
