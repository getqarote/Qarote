import { useCallback, useRef, useState } from "react";

import type {
  LlmFeature,
  LlmMessage,
} from "@api/ee/services/llm/llm.interfaces";
import posthog from "posthog-js";

import { getApiUrl } from "@/lib/runtimeConfig";

function getBaseUrl(): string {
  return getApiUrl() ?? "";
}

/**
 * Reason carried by the `quota` SSE event. Mirrors `QuotaReason` in
 * `apps/api/src/ee/services/llm/llm.interfaces.ts` — kept local to avoid a
 * cross-package dep through the @api path alias.
 *
 * - `cap_reached`     — render the upsell / BYOK fallback card.
 * - `managed_disabled` — render the BYOK fallback card (cap=0).
 * - `ok`              — post-stream snapshot; drives the 80% warning pill +
 *                       settings widget. NOT an at-cap state.
 */
type QuotaReason = "cap_reached" | "managed_disabled" | "ok";

export interface QuotaPayload {
  used: number;
  cap: number | null;
  resetDate: string | null;
  reason: QuotaReason;
}

interface UseStreamingExplainState {
  text: string;
  isStreaming: boolean;
  error: string | null;
  explanationId: string | null;
  fromCache: boolean;
  /**
   * Set when the server emits an at-cap event (`cap_reached` /
   * `managed_disabled`). UI must render the upsell card in this state and
   * ignore `error` — quota is an actionable policy state, not a failure.
   */
  quotaExceeded: QuotaPayload | null;
  /**
   * Latest post-stream quota snapshot (`reason: "ok"`). Drives the
   * progress pill. `null` when there has been no Managed call this
   * session yet OR the workspace is BYOK / unlimited.
   */
  quotaStatus: QuotaPayload | null;
}

type StreamOpts =
  | {
      workspaceId: string;
      feature: "explain_finding";
      findingId: string;
      regenerate?: boolean;
    }
  | {
      workspaceId: string;
      feature: Exclude<LlmFeature, "explain_finding">;
      promptVersion: string;
      messages: LlmMessage[];
      regenerate?: boolean;
    };

interface UseStreamingExplainReturn extends UseStreamingExplainState {
  stream: (opts: StreamOpts) => Promise<void>;
  reset: () => void;
}

interface MetaPayload {
  explanationId: string | null;
  fromCache: boolean;
}

const QUOTA_AT_CAP_REASONS: ReadonlySet<QuotaReason> = new Set([
  "cap_reached",
  "managed_disabled",
]);

const QUOTA_VALID_REASONS: ReadonlySet<string> = new Set([
  "cap_reached",
  "managed_disabled",
  "ok",
] satisfies QuotaReason[]);

/**
 * Event-block SSE parser state machine.
 * SSE events are separated by blank lines; each event may have an
 * `event:` field and one or more `data:` fields.
 */
function parseEventBlocks(
  buffer: string,
  onText: (text: string) => void,
  onMeta: (meta: MetaPayload) => void,
  onQuota: (quota: QuotaPayload) => void,
  onError: (message: string) => void
): string {
  // Normalize line endings so a CRLF that gets split across two TCP reads
  // (one ending in '\r', next starting with '\n') doesn't confuse the
  // block/line splitters below.
  const normalized = buffer.replace(/\r\n?/g, "\n");
  const blocks = normalized.split("\n\n");
  // Last element may be an incomplete block — keep it in the buffer.
  const remaining = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventName = "";
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        // SSE spec: drop at most one leading space after "data:".
        // trimStart() would destroy indentation in code blocks / markdown.
        const payload = line.slice(5);
        dataLines.push(payload.startsWith(" ") ? payload.slice(1) : payload);
      }
    }

    const data = dataLines.join("\n");

    if (eventName === "meta") {
      try {
        const parsed = JSON.parse(data) as MetaPayload;
        onMeta(parsed);
      } catch {
        // Malformed meta — ignore, stream still ends via isStreaming=false in finally
      }
      continue;
    }

    if (eventName === "quota") {
      try {
        const parsed = JSON.parse(data) as QuotaPayload;
        // Minimal shape guard — defends against a future sender shipping a
        // payload variant this client doesn't yet understand.
        if (
          typeof parsed.used === "number" &&
          (parsed.cap === null || typeof parsed.cap === "number") &&
          typeof parsed.reason === "string" &&
          QUOTA_VALID_REASONS.has(parsed.reason)
        ) {
          onQuota(parsed);
        }
      } catch {
        // Malformed quota — ignore.
      }
      continue;
    }

    // Default event (no event: field) — treat as text chunk or error.
    if (!data) continue;

    let isError = false;
    try {
      const parsed = JSON.parse(data) as { error?: string };
      if (parsed && typeof parsed.error === "string") {
        isError = true;
        onError(parsed.error);
      }
    } catch {
      // Not JSON — fall through to text path.
    }
    if (!isError) onText(data);
  }

  return remaining;
}

/**
 * Streams LLM explanation text from the SSE endpoint.
 *
 * Uses event-block SSE parsing (blank-line delimited) to support named
 * events (meta, and future PR B quota event) alongside plain text chunks.
 *
 * Each stream() invocation captures a unique request id; late chunks,
 * errors, or finalizers from a previous request are ignored so they
 * cannot clobber the state of a newer request.
 */
export function useStreamingExplain(): UseStreamingExplainReturn {
  const [state, setState] = useState<UseStreamingExplainState>({
    text: "",
    isStreaming: false,
    error: null,
    explanationId: null,
    fromCache: false,
    quotaExceeded: null,
    quotaStatus: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const statusWorkspaceRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    setState((s) => ({
      text: "",
      isStreaming: false,
      error: null,
      explanationId: null,
      fromCache: false,
      // Keep quotaStatus across reset — settings widget / pill should remain
      // accurate after the drawer closes. Clear only the at-cap flag.
      quotaExceeded: null,
      quotaStatus: s.quotaStatus,
    }));
  }, []);

  const stream = useCallback(async (opts: StreamOpts) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === requestId;
    const safeSetState = (
      updater: (s: UseStreamingExplainState) => UseStreamingExplainState
    ) => {
      if (isCurrent()) setState(updater);
    };

    const prevStatusWorkspace = statusWorkspaceRef.current;
    statusWorkspaceRef.current = opts.workspaceId;

    setState((s) => ({
      text: "",
      isStreaming: true,
      error: null,
      explanationId: null,
      fromCache: false,
      // Wipe at-cap state on a fresh stream; keep the latest known status
      // snapshot for the progress pill so the UI doesn't flash empty.
      // Clear snapshot when the workspace changes to avoid showing stale
      // quota from a previous workspace during cross-workspace navigation.
      quotaExceeded: null,
      quotaStatus:
        prevStatusWorkspace === opts.workspaceId ? s.quotaStatus : null,
    }));

    // 65s client-side guard — 5s margin over the 60s server timeout.
    const timeoutId = setTimeout(() => ac.abort(), 65_000);

    try {
      const body =
        opts.feature === "explain_finding"
          ? {
              workspaceId: opts.workspaceId,
              feature: opts.feature,
              findingId: opts.findingId,
              regenerate: opts.regenerate ?? false,
            }
          : {
              workspaceId: opts.workspaceId,
              feature: opts.feature,
              promptVersion: opts.promptVersion,
              messages: opts.messages,
              regenerate: opts.regenerate ?? false,
            };

      const res = await fetch(`${getBaseUrl()}/api/llm/explain`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-qarote-explain": "1",
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        safeSetState((s) => ({
          ...s,
          isStreaming: false,
          error: (body as { error?: string }).error ?? "Request failed",
        }));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedMeta = false;

      const onText = (text: string) => {
        safeSetState((s) => ({ ...s, text: s.text + text }));
      };
      const onMeta = (meta: MetaPayload) => {
        receivedMeta = true;
        if (meta.explanationId) {
          posthog.capture("llm_explain_persisted", {
            feature: opts.feature,
            from_cache: meta.fromCache,
            explanation_id: meta.explanationId,
          });
        }
        safeSetState((s) => ({
          ...s,
          isStreaming: false,
          explanationId: meta.explanationId,
          fromCache: meta.fromCache,
        }));
      };
      const onQuota = (quota: QuotaPayload) => {
        if (QUOTA_AT_CAP_REASONS.has(quota.reason)) {
          // At-cap event terminates the stream — the server closes the
          // connection after emitting this and never sends a `meta`.
          // Mark streaming done so consumers don't show a spinner forever.
          posthog.capture("llm_quota_exceeded", {
            feature: opts.feature,
            reason: quota.reason,
            used: quota.used,
            cap: quota.cap,
          });
          safeSetState((s) => ({
            ...s,
            isStreaming: false,
            quotaExceeded: quota,
          }));
          return;
        }
        // reason === "ok": post-stream snapshot. Update the status track
        // (drives 80% pill + settings widget) without touching streaming
        // state — a `meta` will follow and finalise the stream.
        safeSetState((s) => ({ ...s, quotaStatus: quota }));
      };
      const onError = (message: string) => {
        safeSetState((s) => ({ ...s, isStreaming: false, error: message }));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = parseEventBlocks(buffer, onText, onMeta, onQuota, onError);
      }

      // Flush any remaining incomplete block on connection close.
      if (buffer.trim()) {
        parseEventBlocks(buffer + "\n\n", onText, onMeta, onQuota, onError);
      }

      if (!receivedMeta) {
        // Stream ended without a meta event — mark done.
        safeSetState((s) => ({ ...s, isStreaming: false }));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      safeSetState((s) => ({
        ...s,
        isStreaming: false,
        error: err instanceof Error ? err.message : "Connection error",
      }));
    } finally {
      clearTimeout(timeoutId);
      safeSetState((s) => (s.isStreaming ? { ...s, isStreaming: false } : s));
    }
  }, []);

  return { ...state, stream, reset };
}
