/**
 * useMessageRecording hooks
 *
 * TanStack Query + tRPC subscription hooks for the Message Tracing page.
 *
 * Patterns mirror useSpyOnQueue from useRabbitMQ.ts:
 * - BoundedBuffer(500) + RAF batching for the live subscription
 * - enabled flag to pause the subscription when switching to Query mode
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";

import { useWorkspace } from "@/hooks/ui/useWorkspace";

import type { MessageTraceEvent, TraceFilters } from "@/types/tracing";

const MAX_LIVE_EVENTS = 500;

// ---------------------------------------------------------------------------
// checkFirehoseStatus
// ---------------------------------------------------------------------------

export const useFirehoseStatus = (serverId: string, serverExists = true) => {
  const { workspace } = useWorkspace();
  return trpc.messages.recording.status.useQuery(
    { serverId, workspaceId: workspace?.id ?? "" },
    {
      enabled: !!serverId && !!workspace?.id && serverExists,
      // Never stale — always reflects live broker state
      staleTime: 0,
      gcTime: 0,
      retry: false,
    }
  );
};

// ---------------------------------------------------------------------------
// setTraceEnabled
// ---------------------------------------------------------------------------

export const useSetTraceEnabled = () => {
  return trpc.messages.recording.setEnabled.useMutation();
};

// ---------------------------------------------------------------------------
// getTraces (cursor-based infinite query)
// ---------------------------------------------------------------------------

interface UseTracesOptions {
  serverId: string | null;
  filters: TraceFilters;
  from: string;
  to: string;
  enabled?: boolean;
  serverExists?: boolean;
}

export const useTraces = ({
  serverId,
  filters,
  from,
  to,
  enabled = true,
  serverExists = true,
}: UseTracesOptions) => {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? "";

  return trpc.messages.recording.query.useInfiniteQuery(
    {
      serverId: serverId ?? "",
      workspaceId,
      ...filters,
      from,
      to,
      limit: 50,
    },
    {
      enabled:
        !!serverId &&
        !!workspaceId &&
        enabled &&
        !!from &&
        !!to &&
        serverExists,
      initialCursor: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 30_000,
    }
  );
};

// ---------------------------------------------------------------------------
// getTraceStats
// ---------------------------------------------------------------------------

export const useTraceStats = (
  serverId: string,
  windowMinutes: 5 | 60 = 5,
  enabled = true,
  serverExists = true
) => {
  const { workspace } = useWorkspace();
  return trpc.messages.recording.stats.useQuery(
    { serverId, workspaceId: workspace?.id ?? "", windowMinutes },
    {
      enabled: !!serverId && !!workspace?.id && enabled && serverExists,
      refetchInterval: 15_000,
      staleTime: 10_000,
    }
  );
};

// ---------------------------------------------------------------------------
// watchTraces (live subscription)
// ---------------------------------------------------------------------------

interface UseWatchTracesOptions {
  serverId: string;
  filters: TraceFilters;
  enabled: boolean;
}

export const useWatchTraces = ({
  serverId,
  filters,
  enabled,
}: UseWatchTracesOptions) => {
  const { workspace } = useWorkspace();
  const [events, setEvents] = useState<MessageTraceEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dropped, setDropped] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  // True once the router confirms the subscription is live ("started" packet).
  // Without this, isLoading stays true forever on an idle-but-healthy broker
  // because events.length never leaves 0.
  const [started, setStarted] = useState(false);
  // Set when the backend emits a preview_limit event — the subscription has
  // been soft-capped and no further events will arrive for free-plan users.
  const [isPreviewLimited, setIsPreviewLimited] = useState(false);

  // RAF batching — same pattern as useSpyOnQueue
  const pendingRef = useRef<MessageTraceEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const eventsRef = useRef<MessageTraceEvent[]>([]);
  const pendingEvictedRef = useRef(0);

  const flushPending = useCallback(() => {
    rafRef.current = null;
    const pending = pendingRef.current;
    const pendingEvicted = pendingEvictedRef.current;
    if (pending.length === 0 && pendingEvicted === 0) return;
    pendingRef.current = [];
    pendingEvictedRef.current = 0;

    const combined = [...eventsRef.current, ...pending];
    const evicted = Math.max(0, combined.length - MAX_LIVE_EVENTS);
    const next = evicted > 0 ? combined.slice(-MAX_LIVE_EVENTS) : combined;

    eventsRef.current = next;
    setEvents(next);
    // Accumulate ALL client-side evictions: ring-buffer merge trim (evicted)
    // plus pending-buffer overflow (pendingEvicted tracked in onData).
    if (evicted > 0 || pendingEvicted > 0) {
      setDropped((prev) => prev + evicted + pendingEvicted);
    }
    setTotalReceived((prev) => prev + pending.length + pendingEvicted);
  }, []);

  const clearEvents = useCallback(() => {
    pendingRef.current = [];
    eventsRef.current = [];
    pendingEvictedRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setEvents([]);
    setTotalReceived(0);
    setDropped(0);
    // Also clear the error so the Retry button exits the error screen and the
    // live subscription re-initialises (isActive becomes true again).
    setError(null);
    setStarted(false);
    setIsPreviewLimited(false);
  }, []);

  // Cancel any pending RAF on unmount to prevent setState after teardown.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Reset the event buffer whenever the server or any filter field changes so
  // stale events that don't match the active filter set don't remain visible.
  const { vhost, queueName, exchange, routingKey, direction } = filters;
  useEffect(() => {
    clearEvents();
  }, [
    serverId,
    vhost,
    queueName,
    exchange,
    routingKey,
    direction,
    clearEvents,
  ]);

  // Pause the subscription when the tab is hidden to save bandwidth and
  // server-side polling cycles. Resumes automatically when the tab refocuses.
  const [tabVisible, setTabVisible] = useState(
    () =>
      typeof document === "undefined" || document.visibilityState !== "hidden"
  );
  useEffect(() => {
    const handleVisibility = () =>
      setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const isActive = !!serverId && !!workspace?.id && enabled && tabVisible;

  trpc.messages.recording.subscribe.useSubscription(
    {
      serverId,
      workspaceId: workspace?.id ?? "",
      ...filters,
    },
    {
      enabled: isActive,
      onData: (data) => {
        if (data.type === "started") {
          setStarted(true);
          setError(null);
        } else if (data.type === "events") {
          setStarted(true);
          // Client-side evictions are now accumulated in flushPending; the
          // server-reported data.dropped reflects subscription-buffer overflows
          // that we never received, so they are not subtracted here to avoid
          // double-counting with pendingEvictedRef.
          pendingRef.current.push(...data.events);
          if (pendingRef.current.length > MAX_LIVE_EVENTS) {
            const overflow = pendingRef.current.length - MAX_LIVE_EVENTS;
            pendingRef.current = pendingRef.current.slice(-MAX_LIVE_EVENTS);
            pendingEvictedRef.current += overflow;
          }
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(flushPending);
          }
        } else if (data.type === "preview_limit") {
          // Backend has soft-capped the stream — no further events will arrive.
          setIsPreviewLimited(true);
        } else if (data.type === "error") {
          setError(data.message);
        }
      },
      onError: (err) => {
        setStarted(true);
        setError(err.message);
      },
    }
  );

  return {
    events,
    error,
    dropped,
    totalReceived,
    clearEvents,
    isPreviewLimited,
    isLoading: isActive && !started && events.length === 0 && !error,
  };
};
