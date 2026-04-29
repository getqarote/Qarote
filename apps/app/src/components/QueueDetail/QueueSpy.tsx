import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertTriangle, ArrowDown, Loader2, Radio, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PixelTrash } from "@/components/ui/pixel-trash";
import { ScrollArea } from "@/components/ui/scrollArea";

import { useSpyOnQueue } from "@/hooks/queries/useRabbitMQ";

import { SpyMessageRow } from "./SpyMessageRow";

interface QueueSpyProps {
  serverId: string;
  queueName: string;
  vhost: string;
}

export function QueueSpy({ serverId, queueName, vhost }: QueueSpyProps) {
  const { t } = useTranslation("queues");
  /** Must match FREE_SPY_PREVIEW_COUNT in queues.ts */
  const FREE_SPY_PREVIEW_COUNT = 5;

  const {
    messages,
    error,
    spyInfo,
    dropped,
    totalReceived,
    isLoading,
    clearMessages,
    isPreviewLimited,
  } = useSpyOnQueue(serverId, queueName, vhost, true);

  // Auto-scroll via IntersectionObserver.
  //
  // The Radix ScrollArea uses overflow:hidden on its Root and Viewport and
  // manages scrolling internally — there is NO native scrollable ancestor
  // between the sentinel and the document. So calling
  // sentinelRef.current.scrollIntoView() would scroll the entire PAGE
  // (jumping past the spy card to whatever is below it), and an
  // IntersectionObserver with default root would track visibility against
  // the page viewport instead of the spy log viewport.
  //
  // Both issues are fixed by resolving the actual Radix viewport element
  // ([data-radix-scroll-area-viewport]) on mount and using it as the
  // observer root + the manual scroll target.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  // Use the monotonic totalReceived counter (not messages.length, which is
  // capped at MAX_SPY_MESSAGES — once full, length stops growing and the
  // diff would always be 0).
  const prevTotalReceivedRef = useRef(0);

  // Resolve the Radix viewport once on mount and observe the sentinel
  // against it. Using the viewport as the root scopes "isAtBottom" to the
  // spy log's own scroll position rather than the page's.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollAreaRef.current?.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]"
    );
    if (!sentinel || !root) return;

    viewportRef.current = root;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting);
        if (entry.isIntersecting) {
          setNewMessageCount(0);
        }
      },
      { root, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Track new messages when not at bottom
  useEffect(() => {
    if (!isAtBottom && totalReceived > prevTotalReceivedRef.current) {
      setNewMessageCount(
        (prev) => prev + (totalReceived - prevTotalReceivedRef.current)
      );
    }
    prevTotalReceivedRef.current = totalReceived;
  }, [totalReceived, isAtBottom]);

  // Auto-scroll when at bottom and new messages arrive.
  // Skip entirely on empty mount (totalReceived === 0) so clicking
  // "Spy on Queue" doesn't jump the whole page. Manipulate scrollTop on
  // the viewport directly instead of scrollIntoView, which would walk up
  // and scroll the document because the ScrollArea has overflow:hidden.
  useEffect(() => {
    if (totalReceived === 0) return;
    if (!isAtBottom) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [totalReceived, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    setNewMessageCount(0);
  }, []);

  // Accessibility: throttled aria-live announcement
  const [ariaMessage, setAriaMessage] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      if (messages.length > 0) {
        setAriaMessage(t("spyMessages", { count: messages.length }));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [messages.length, t]);

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section flex items-center gap-2">
            <Radio className="w-4 h-4" />
            {t("spyTitle")}
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <h2 className="title-section flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          {t("spyTitle")}

          {messages.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {messages.length}
            </Badge>
          )}

          {dropped > 0 && (
            <Badge variant="outline" className="text-xs text-warning">
              {t("spyDropped", { count: dropped })}
            </Badge>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {spyInfo && (
            <span className="text-xs text-muted-foreground">
              {t("spyStarted", { count: spyInfo.bindingCount })}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearMessages}
            disabled={messages.length === 0}
          >
            <PixelTrash className="h-3 w-auto shrink-0 mr-1" />
            {t("spyClear")}
          </Button>
        </div>
      </div>

      <div>
        {/* Screen reader announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {ariaMessage}
        </div>

        <div className="relative">
          <ScrollArea
            className="h-[400px] border-t"
            ref={scrollAreaRef}
            role="log"
            aria-label={t("spyTitle")}
          >
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t("spyListening")}</span>
              </div>
            )}

            {!isLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Radio className="w-5 h-5 animate-pulse" />
                <span className="text-sm">{t("spyListening")}</span>
                <span className="text-xs">{t("spyDescription")}</span>
              </div>
            )}

            {messages.map((msg) => (
              <SpyMessageRow key={msg.id} message={msg} />
            ))}

            {/* Sentinel for auto-scroll detection */}
            <div ref={sentinelRef} className="h-px" />
          </ScrollArea>

          {/* "New messages" floating badge */}
          {!isAtBottom && newMessageCount > 0 && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-full shadow-md hover:bg-primary/90 transition-colors"
            >
              <ArrowDown className="w-3 h-3" />
              {t("spyNewMessages", { count: newMessageCount })}
            </button>
          )}
        </div>

        {/* Soft-preview teaser — shown when free-plan message cap is reached */}
        {isPreviewLimited && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              {t("spyPreviewBanner", { count: FREE_SPY_PREVIEW_COUNT })}
            </div>
            <Button
              variant="default"
              size="sm"
              className="shrink-0 text-xs h-7"
              onClick={() => window.open("https://qarote.io/pricing", "_blank", "noopener,noreferrer")}
            >
              {t("spyPreviewUpgrade")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
