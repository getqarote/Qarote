import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AlertTriangle, ArrowDown, Loader2, Radio, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { messages, error, spyInfo, dropped, isLoading, clearMessages } =
    useSpyOnQueue(serverId, queueName, vhost, true);

  // Auto-scroll via IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const prevMessageCountRef = useRef(0);

  // Track whether user is at the bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting);
        if (entry.isIntersecting) {
          setNewMessageCount(0);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Track new messages when not at bottom
  useEffect(() => {
    if (!isAtBottom && messages.length > prevMessageCountRef.current) {
      setNewMessageCount(
        (prev) => prev + (messages.length - prevMessageCountRef.current)
      );
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, isAtBottom]);

  // Auto-scroll when at bottom and new messages arrive
  useEffect(() => {
    if (isAtBottom && sentinelRef.current) {
      sentinelRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages.length, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    if (sentinelRef.current) {
      sentinelRef.current.scrollIntoView({ behavior: "smooth" });
      setNewMessageCount(0);
    }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="w-4 h-4" />
            {t("spyTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            {t("spyTitle")}

            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length}
              </Badge>
            )}

            {dropped > 0 && (
              <Badge variant="outline" className="text-xs text-yellow-600">
                {t("spyDropped", { count: dropped })}
              </Badge>
            )}
          </CardTitle>

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
              <Trash2 className="w-3 h-3 mr-1" />
              {t("spyClear")}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Screen reader announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {ariaMessage}
        </div>

        <div className="relative">
          <ScrollArea
            className="h-[400px] border-t"
            ref={scrollViewportRef}
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
      </CardContent>
    </Card>
  );
}
