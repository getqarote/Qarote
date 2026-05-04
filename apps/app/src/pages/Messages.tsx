/**
 * Messages page — unified Live (Spy) + Recorded (Firehose) experience.
 *
 * Top-level modes (URL ?mode=):
 *   live     — QueueSpy per-queue tap (no firehose required).
 *              Queue pre-selected via ?queue=<name>&vhost=<vh> deep-link
 *              from QueueDetail. Default when firehose is inactive.
 *   recorded — Firehose-based stream + history query. Default when firehose
 *              is active. Gated by FeatureGate(message_tracing).
 *
 * Within Recorded mode:
 *   Stream   — live tail of firehose events (requires firehose active)
 *   History  — cursor-based query over a time range
 *
 * Default mode: ?mode= absent → "recorded" if firehose active, else "live".
 * Back/Forward: topMode derived from URL, no local state needed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import {
  AlertTriangle,
  ArrowDown,
  Database,
  Info,
  Loader2,
  Pause,
  Play,
  Radio,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

import { SentryErrorBoundary } from "@/lib/sentry";

import { FeatureGate } from "@/components/feature-gate/FeatureGate";
import { QueueSpy } from "@/components/messages/QueueSpy";
import { PageShell } from "@/components/PageShell";
import { FirehoseDisabledState } from "@/components/tracing/FirehoseDisabledState";
import {
  TracingFiltersBar,
  useTracingFilters,
} from "@/components/tracing/TracingFiltersBar";
import { TracingMessageRow } from "@/components/tracing/TracingMessageRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scrollArea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import {
  useFirehoseStatus,
  useSetTraceEnabled,
  useTraces,
  useTraceStats,
  useWatchTraces,
} from "@/hooks/queries/useMessageRecording";
import { useQueues } from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import type { MessageTraceEvent } from "@/types/tracing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date as "YYYY-MM-DDTHH:MM" in local time for datetime-local inputs.
 *  Using toISOString() would produce UTC, which datetime-local inputs interpret
 *  as local time — causing a timezone shift for users outside UTC. */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// StatsBar
// ---------------------------------------------------------------------------

function StatsBar({ serverId }: { serverId: string }) {
  const { t } = useTranslation("tracing");
  const { data } = useTraceStats(serverId, 5);

  if (!data) return null;

  return (
    <div className="flex flex-wrap items-center gap-6 px-4 py-2 bg-muted/20 border-b border-border text-xs">
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono font-medium text-foreground tabular-nums">
          {data.publishCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground">{t("stats.published")}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-mono font-medium text-foreground tabular-nums">
          {data.deliverCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground">{t("stats.delivered")}</span>
      </span>
      {data.topQueues.length > 0 && (
        <span className="hidden sm:flex items-baseline gap-1.5 text-muted-foreground">
          {t("stats.topQueues")}:{" "}
          <span className="font-mono">
            {data.topQueues
              .slice(0, 3)
              .map((q) => `${q.queueName} (${q.count})`)
              .join(", ")}
          </span>
        </span>
      )}
      <span className="ml-auto text-muted-foreground/60">
        {t("stats.retention")}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LiveTail
// ---------------------------------------------------------------------------

/** Number of events the backend shows free-plan users. Must match FREE_TRACE_PREVIEW_COUNT. */
const FREE_TRACE_PREVIEW_COUNT = 10;

function LiveTail({
  serverId,
  enabled,
}: {
  serverId: string;
  enabled: boolean;
}) {
  const { t } = useTranslation("tracing");
  const filters = useTracingFilters();
  const {
    events,
    error,
    dropped,
    totalReceived,
    isLoading,
    clearEvents,
    isPreviewLimited,
  } = useWatchTraces({ serverId, filters, enabled });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const prevTotalRef = useRef(0);

  // Pause state — subscription keeps running; we freeze the display snapshot
  const [paused, setPaused] = useState(false);
  const [frozenEvents, setFrozenEvents] = useState<MessageTraceEvent[]>([]);
  const [frozenTotal, setFrozenTotal] = useState(0);

  const displayedEvents = paused ? frozenEvents : events;
  const bufferedCount = paused ? Math.max(0, totalReceived - frozenTotal) : 0;

  const handlePause = useCallback(() => {
    setFrozenEvents([...events]);
    setFrozenTotal(totalReceived);
    setPaused(true);
  }, [events, totalReceived]);

  const handleResume = useCallback(() => {
    setPaused(false);
    setFrozenTotal(0); // reset so the next pause gets a fresh baseline
    setNewCount(0);
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  // Resolve Radix viewport (same pattern as QueueSpy)
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
        if (entry.isIntersecting) setNewCount(0);
      },
      { root, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Track new messages when not at bottom and not paused
  useEffect(() => {
    if (!paused && !isAtBottom && totalReceived > prevTotalRef.current) {
      setNewCount((prev) => prev + (totalReceived - prevTotalRef.current));
    }
    prevTotalRef.current = totalReceived;
  }, [totalReceived, isAtBottom, paused]);

  // Auto-scroll — suppressed while paused
  useEffect(() => {
    if (totalReceived === 0 || !isAtBottom || paused) return;
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [totalReceived, isAtBottom, paused]);

  const scrollToBottom = useCallback(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
    setNewCount(0);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col gap-3 p-5 m-4 bg-destructive/10 rounded-md">
        <div className="flex items-start gap-3 text-sm text-destructive">
          <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{t("live.errorTitle")}</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {t("live.errorHint")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-fit text-xs"
          onClick={clearEvents}
        >
          {t("live.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Status dot — green live, amber paused, gray disabled */}
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            {enabled && !paused && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                !enabled
                  ? "bg-muted-foreground"
                  : paused
                    ? "bg-warning"
                    : "bg-success"
              }`}
            />
          </span>
          <span className="text-xs text-muted-foreground">
            {paused
              ? t("live.paused", { count: bufferedCount })
              : t("live.showing", { count: displayedEvents.length })}
          </span>
          {dropped > 0 && (
            <Badge variant="outline" className="text-xs text-warning">
              {t("live.dropped", { count: dropped })}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Pause / Resume toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={paused ? handleResume : handlePause}
            disabled={!paused && events.length === 0}
            aria-label={paused ? t("live.resume") : t("live.pause")}
          >
            {paused ? (
              <Play className="w-3 h-3" />
            ) : (
              <Pause className="w-3 h-3" />
            )}
            {paused ? t("live.resume") : t("live.pause")}
          </Button>

          {/* Clear — also exits pause mode */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              clearEvents();
              setPaused(false);
            }}
            disabled={displayedEvents.length === 0 && !paused}
          >
            {t("live.clear")}
          </Button>
        </div>
      </div>

      <div className="relative">
        <ScrollArea
          className="h-[480px]"
          ref={scrollAreaRef}
          role="log"
          aria-live="polite"
          aria-label={t("page.title")}
        >
          {isLoading && !paused && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t("live.listening")}</span>
            </div>
          )}
          {!isLoading && displayedEvents.length === 0 && !paused && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="text-sm">{t("live.listening")}</span>
              <span className="text-xs">{t("live.description")}</span>
            </div>
          )}
          {displayedEvents.map((evt) => (
            <TracingMessageRow key={evt.id} event={evt} />
          ))}
          <div ref={sentinelRef} className="h-px" />
        </ScrollArea>

        {/* Scroll-to-bottom badge — only when live and scrolled up */}
        {!paused && !isAtBottom && newCount > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-full shadow-md hover:bg-primary/90 transition-colors"
          >
            <ArrowDown className="w-3 h-3" />
            {t("live.newMessages", { count: newCount })}
          </button>
        )}

        {/* Paused banner — click to resume */}
        {paused && (
          <button
            type="button"
            onClick={handleResume}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-warning text-warning-foreground text-xs rounded-full shadow-md hover:bg-warning/90 transition-colors"
          >
            <Play className="w-3 h-3" />
            {bufferedCount > 0
              ? t("live.resumeWithCount", { count: bufferedCount })
              : t("live.resume")}
          </button>
        )}
      </div>

      {/* Soft-preview teaser — shown when free-plan cap is reached */}
      {isPreviewLimited && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            {t("preview.liveBanner", { count: FREE_TRACE_PREVIEW_COUNT })}
          </div>
          <Button
            variant="default"
            size="sm"
            className="shrink-0 text-xs h-7"
            onClick={() =>
              window.open(
                "https://qarote.io/pricing",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            {t("preview.upgrade")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QueryView
// ---------------------------------------------------------------------------

function QueryView({ serverId }: { serverId: string }) {
  const { t } = useTranslation("tracing");
  const filters = useTracingFilters();

  // Default: last hour — expressed in local time so <input type="datetime-local">
  // displays the correct value. toISOString() returns UTC, which datetime-local
  // inputs interpret as local time, causing a timezone shift for non-UTC users.
  const [from, setFrom] = useState(() =>
    toDatetimeLocal(new Date(Date.now() - 60 * 60 * 1000))
  );
  const [to, setTo] = useState(() => toDatetimeLocal(new Date()));

  // Guard against Invalid Date: datetime-local inputs occasionally yield a
  // non-empty but unparseable string while the user is mid-edit. new Date()
  // on such a string produces an Invalid Date whose toISOString() throws.
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  const fromISO = Number.isFinite(fromMs) ? new Date(fromMs).toISOString() : "";
  const toISO = Number.isFinite(toMs) ? new Date(toMs).toISOString() : "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useTraces({
      serverId,
      filters,
      from: fromISO,
      to: toISO,
      enabled: !!fromISO && !!toISO,
    });

  const allEvents = data?.pages.flatMap((p) => p.events) ?? [];
  // isPreview is set on the first page by the backend when the free-plan cap applies.
  const isPreview = data?.pages[0]?.isPreview ?? false;

  return (
    <div>
      <div className="px-4 py-2 border-b border-border">
        <TracingFiltersBar
          serverId={serverId}
          showTimeRange
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("query.loading")}</span>
        </div>
      )}

      {!isLoading && allEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <Database className="w-5 h-5" />
          <span className="text-sm">{t("query.noResults")}</span>
        </div>
      )}

      {allEvents.map((evt) => (
        <TracingMessageRow key={evt.id} event={evt} />
      ))}

      {hasNextPage && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            ) : null}
            {t("query.loadMore")}
          </Button>
        </div>
      )}

      {/* Soft-preview teaser — shown when free-plan query cap is active */}
      {!isLoading && isPreview && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            {t("preview.queryBanner", { count: FREE_TRACE_PREVIEW_COUNT })}
          </div>
          <Button
            variant="default"
            size="sm"
            className="shrink-0 text-xs h-7"
            onClick={() =>
              window.open(
                "https://qarote.io/pricing",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            {t("preview.upgrade")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LiveSpyContent — queue picker + per-queue spy (no firehose required)
// ---------------------------------------------------------------------------

function LiveSpyContent({
  serverId,
  initialQueueName,
}: {
  serverId: string;
  initialQueueName?: string;
}) {
  const { t } = useTranslation("tracing");
  const { selectedVHost } = useVHostContext();
  const { data: queuesData, isLoading } = useQueues(serverId, selectedVHost);
  const queues = queuesData?.queues ?? [];
  const [selectedQueueName, setSelectedQueueName] = useState<string>(
    initialQueueName ?? ""
  );

  // Reset selection when vhost changes — the queue may not exist on the new vhost.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedQueueName("");
  }, [selectedVHost]);

  const selectedQueue = queues.find((q) => q.name === selectedQueueName);

  return (
    <div>
      {/* Queue picker */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm text-muted-foreground shrink-0">
          {t("spy.queueLabel")}
        </span>
        <Select
          value={selectedQueueName}
          onValueChange={setSelectedQueueName}
          disabled={isLoading || queues.length === 0}
        >
          <SelectTrigger className="h-8 text-sm max-w-xs">
            <SelectValue
              placeholder={
                isLoading ? t("spy.loadingQueues") : t("spy.selectQueue")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {queues.map((q) => (
              <SelectItem key={`${q.vhost}/${q.name}`} value={q.name}>
                <span className="font-mono text-xs">{q.name}</span>
                {q.type && q.type !== "classic" && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {q.type}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Spy panel */}
      {selectedQueue ? (
        <div className="p-4">
          <QueueSpy
            serverId={serverId}
            queueName={selectedQueue.name}
            vhost={selectedQueue.vhost ?? selectedVHost ?? "/"}
            queueType={
              selectedQueue.type as "classic" | "quorum" | "stream" | undefined
            }
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <Radio className="w-5 h-5" />
          <span className="text-sm">{t("spy.selectQueueHint")}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TracingContent (inside the gate, after firehose check)
// ---------------------------------------------------------------------------

/**
 * localStorage key for the mode-switch banner dismissal state. Per
 * mode so an operator who's seen the live-mode tip but is new to
 * recorded-mode still gets the corresponding tip the first time they
 * land there. Versioned (`-v1`) so a future copy revision can bump
 * and re-surface the banner without orphaning prior dismissals.
 */
const MODE_BANNER_DISMISSED_KEY = "qarote.messages.modeBanner.dismissed-v1";

/**
 * Read the per-mode dismissal set from localStorage. Returns an empty
 * Set on parse failure / absence rather than throwing — a corrupted
 * value should never break the page render.
 */
function readDismissedModes(): Set<"live" | "query"> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(MODE_BANNER_DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((v): v is "live" | "query" => v === "live" || v === "query")
    );
  } catch {
    return new Set();
  }
}

function persistDismissedModes(modes: Set<"live" | "query">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MODE_BANNER_DISMISSED_KEY,
      JSON.stringify([...modes])
    );
  } catch {
    // Quota exceeded / private mode — operator just sees the banner
    // again next session, which is the safe direction.
  }
}

interface RecordedContentProps {
  serverId: string;
  firehoseActive: boolean;
  firehoseVhosts: { name: string; tracing: boolean }[];
  isEnablingFirehose: boolean;
  onEnableFirehose: () => Promise<void>;
}

function RecordedContent({
  serverId,
  firehoseActive,
  firehoseVhosts,
  isEnablingFirehose,
  onEnableFirehose,
}: RecordedContentProps) {
  const { t } = useTranslation("tracing");
  const [mode, setMode] = useState<"live" | "query">("live");

  // Mode-switch advisory banner — surfaces the trade-off between
  // "what you see now" and "what's archived". Without this, operators
  // routinely click Live, see nothing for a quiet vhost, and conclude
  // the firehose is broken — when they should have queried Recorded.
  // Per-mode dismissal so a power user sees each tip exactly once.
  const [dismissedModes, setDismissedModes] = useState<Set<"live" | "query">>(
    () => readDismissedModes()
  );
  const bannerDismissed = dismissedModes.has(mode);
  const dismissBanner = useCallback(() => {
    setDismissedModes((prev) => {
      const next = new Set(prev);
      next.add(mode);
      persistDismissedModes(next);
      return next;
    });
  }, [mode]);

  return (
    <>
      {/* Recorded sub-mode header: Stream | History */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            aria-pressed={mode === "live"}
            onClick={() => setMode("live")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === "live"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("mode.live")}
          </button>
          <button
            type="button"
            aria-pressed={mode === "query"}
            onClick={() => setMode("query")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mode === "query"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("mode.query")}
          </button>
        </div>
      </div>

      {/* Mode-switch advisory — explains what each mode does and how
          to switch. Hidden once the operator dismisses it for the
          current mode (per-mode + persistent). */}
      {!bannerDismissed && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 px-4 py-2 border-b border-border bg-blue-500/5 text-xs text-blue-700 dark:text-blue-400"
        >
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
          <p className="flex-1">
            {mode === "live" ? t("mode.tipLive") : t("mode.tipQuery")}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "live" ? "query" : "live")}
              className="underline hover:no-underline"
            >
              {mode === "live"
                ? t("mode.switchToQuery")
                : t("mode.switchToLive")}
            </button>
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label={t("mode.dismissTip")}
            title={t("mode.dismissTip")}
            className="shrink-0 -m-0.5 p-0.5 rounded text-blue-700/60 hover:text-blue-700 dark:text-blue-400/60 dark:hover:text-blue-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Stats bar */}
      <StatsBar serverId={serverId} />

      {/* Filters — shared across both modes, time range only in query */}
      {mode === "live" && (
        <div className="px-4 py-2 border-b border-border">
          <TracingFiltersBar serverId={serverId} />
        </div>
      )}

      {/* Content */}
      {mode === "live" ? (
        <LiveTail serverId={serverId} enabled={mode === "live"} />
      ) : firehoseActive ? (
        <QueryView serverId={serverId} />
      ) : (
        <FirehoseDisabledState
          vhosts={firehoseVhosts}
          isEnabling={isEnablingFirehose}
          onEnable={onEnableFirehose}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// MessagesContent — top-level Spy | Recorded switcher
// ---------------------------------------------------------------------------

interface MessagesContentProps {
  serverId: string;
  firehoseActive: boolean;
  firehoseVhosts: { name: string; tracing: boolean }[];
  isEnablingFirehose: boolean;
  onEnableFirehose: () => Promise<void>;
}

function MessagesContent({
  serverId,
  firehoseActive,
  firehoseVhosts,
  isEnablingFirehose,
  onEnableFirehose,
}: MessagesContentProps) {
  const { t } = useTranslation("tracing");
  const [searchParams, setSearchParams] = useSearchParams();

  const modeParam = searchParams.get("mode"); // "live" | "recorded" | null
  const queueParam = searchParams.get("queue") ?? undefined;

  // MAJOR 2: derive topMode from URL — Back/Forward updates mode automatically.
  // MAJOR 4: when no ?mode= param, default to "recorded" if firehose is
  // active (more powerful), else "live" (always accessible without firehose).
  const topMode: "live" | "recorded" =
    modeParam === "recorded"
      ? "recorded"
      : modeParam === "live"
        ? "live"
        : firehoseActive
          ? "recorded"
          : "live";

  const switchMode = (mode: "live" | "recorded") => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("mode", mode);
        if (mode !== "live") {
          next.delete("queue");
          next.delete("vhost");
        }
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Top-level header: title + Live | Recorded switcher */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <h1 className="title-section">{t("page.title")}</h1>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            aria-pressed={topMode === "live"}
            onClick={() => switchMode("live")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
              topMode === "live"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="h-3 w-3" aria-hidden />
            {t("mode.spy")}
          </button>
          <button
            type="button"
            aria-pressed={topMode === "recorded"}
            onClick={() => switchMode("recorded")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors ${
              topMode === "recorded"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="h-3 w-3" aria-hidden />
            {t("mode.recorded")}
          </button>
        </div>
      </div>

      {/* Mode content */}
      {topMode === "live" ? (
        <LiveSpyContent serverId={serverId} initialQueueName={queueParam} />
      ) : (
        <FeatureGate feature="message_tracing" serverId={serverId}>
          <RecordedContent
            serverId={serverId}
            firehoseActive={firehoseActive}
            firehoseVhosts={firehoseVhosts}
            isEnablingFirehose={isEnablingFirehose}
            onEnableFirehose={onEnableFirehose}
          />
        </FeatureGate>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TracingGated (checks firehose status, renders content or disabled state)
// ---------------------------------------------------------------------------

function TracingGated({ serverId }: { serverId: string }) {
  const { t } = useTranslation("tracing");
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";
  const {
    data: firehoseStatus,
    isLoading,
    refetch,
  } = useFirehoseStatus(serverId);
  const setTraceEnabled = useSetTraceEnabled();
  const [isEnabling, setIsEnabling] = useState(false);
  const [partialEnableWarning, setPartialEnableWarning] = useState<
    string | null
  >(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t("live.checkingStatus")}</span>
      </div>
    );
  }

  if (firehoseStatus?.error === "management_api_unavailable") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <WifiOff className="w-8 h-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">
            {t("empty.managementApi.title")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("empty.managementApi.description")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          {t("empty.managementApi.retry")}
        </Button>
      </div>
    );
  }

  const handleEnableFirehose = async () => {
    setIsEnabling(true);
    try {
      const result = await setTraceEnabled.mutateAsync({
        serverId,
        workspaceId,
        enabled: true,
      });
      if (!result.success) {
        const totalVhosts = firehoseStatus?.vhosts.length ?? 0;
        const failedCount = result.failedVhosts?.length ?? 0;
        if (totalVhosts > 0 && failedCount < totalVhosts) {
          await refetch();
          setPartialEnableWarning(
            result.failedVhosts?.length
              ? `${t("empty.firehose.enableError")}: ${result.failedVhosts.join(", ")}`
              : t("empty.firehose.enableError")
          );
        } else {
          throw new Error(
            result.failedVhosts?.length
              ? `${t("empty.firehose.enableError")}: ${result.failedVhosts.join(", ")}`
              : t("empty.firehose.enableError")
          );
        }
      } else {
        await refetch();
      }
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <>
      {partialEnableWarning && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{partialEnableWarning}</span>
        </div>
      )}
      <MessagesContent
        serverId={serverId}
        firehoseActive={firehoseStatus?.active ?? false}
        firehoseVhosts={firehoseStatus?.vhosts ?? []}
        isEnablingFirehose={isEnabling}
        onEnableFirehose={handleEnableFirehose}
      />
    </>
  );
}

/** Fallback rendered by the error boundary when TracingGated crashes.
 *  Defined as a named component so useTranslation can be called as a hook. */
function TracingErrorFallback() {
  const { t } = useTranslation("tracing");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <WifiOff className="w-5 h-5 text-destructive" />
      <p className="text-sm font-medium text-destructive">
        {t("page.errorTitle")}
      </p>
      <p className="text-xs">{t("page.errorHint")}</p>
    </div>
  );
}

// Wrap TracingGated in an error boundary so render errors inside the feature
// (e.g. malformed trace event data, hook failures) produce a recoverable UI
// rather than crashing the entire page. Defined at module level — not inside
// a render function — so React sees a stable component reference.
const TracingGatedBounded = SentryErrorBoundary(TracingGated, {
  fallback: () => <TracingErrorFallback />,
});

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function Tracing() {
  const { t } = useTranslation("tracing");
  const { selectedServerId } = useServerContext();

  if (!selectedServerId) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          {t("page.selectServer")}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TracingGatedBounded serverId={selectedServerId} />
    </PageShell>
  );
}
