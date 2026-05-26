// @vitest-environment jsdom
/**
 * Tests for the SSE-driven explain stream.
 *
 * Two layers:
 *  1. parseEventBlocks — the `step` event path and its 3-field shape guard
 *     (id / i18nKey / done); a malformed step must be dropped silently
 *     rather than crash the stream or leak into the text/error channels.
 *  2. useStreamingExplain — the step reducers that derive checklist state
 *     from the raw events: dedupe by id, complete prior steps when a new one
 *     arrives, complete the active step on first text, and clear stale steps
 *     on reset / a fresh stream.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExplainStep } from "./useStreamingExplain";
import { parseEventBlocks, useStreamingExplain } from "./useStreamingExplain";

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

vi.mock("@/lib/runtimeConfig", () => ({
  getApiUrl: () => "",
}));

/**
 * Drive parseEventBlocks with the given buffer and capture every callback
 * invocation. Returns the spies plus the leftover (incomplete) block so a
 * single test can assert routing, payloads, and buffering at once.
 */
function run(buffer: string) {
  const onText = vi.fn<(t: string) => void>();
  const onMeta = vi.fn();
  const onQuota = vi.fn();
  const onError = vi.fn<(m: string) => void>();
  const steps: ExplainStep[] = [];
  const onStep = (s: ExplainStep) => steps.push(s);

  const remaining = parseEventBlocks(
    buffer,
    onText,
    onMeta,
    onQuota,
    onError,
    onStep
  );

  return { onText, onMeta, onQuota, onError, steps, remaining };
}

function stepBlock(payload: unknown): string {
  return `event: step\ndata: ${JSON.stringify(payload)}\n\n`;
}

describe("parseEventBlocks — step events", () => {
  it("emits a well-formed step and routes nothing to text/error", () => {
    const { steps, onText, onError } = run(
      stepBlock({ id: "broker", i18nKey: "step.brokerRead", done: false })
    );
    expect(steps).toEqual([
      { id: "broker", i18nKey: "step.brokerRead", done: false },
    ]);
    expect(onText).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("emits each step in order when several arrive in one buffer", () => {
    const { steps } = run(
      stepBlock({ id: "a", i18nKey: "step.brokerRead", done: false }) +
        stepBlock({ id: "b", i18nKey: "step.firehose", done: true })
    );
    expect(steps.map((s) => s.id)).toEqual(["a", "b"]);
    expect(steps[1].done).toBe(true);
  });

  it.each([
    ["missing id", { i18nKey: "step.brokerRead", done: false }],
    ["non-string id", { id: 7, i18nKey: "step.brokerRead", done: false }],
    ["missing i18nKey", { id: "a", done: false }],
    ["non-string i18nKey", { id: "a", i18nKey: 9, done: false }],
    ["missing done", { id: "a", i18nKey: "step.brokerRead" }],
    ["non-boolean done", { id: "a", i18nKey: "step.brokerRead", done: "yes" }],
  ])("drops a step with %s (shape guard)", (_label, payload) => {
    const { steps, onText, onError } = run(stepBlock(payload));
    expect(steps).toEqual([]);
    expect(onText).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("drops a step with malformed JSON without throwing", () => {
    const { steps, onError } = run("event: step\ndata: {not json\n\n");
    expect(steps).toEqual([]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("keeps an incomplete trailing step block in the buffer", () => {
    const partial = `event: step\ndata: {"id":"a","i18nKey":"step.brokerRead"`;
    const { steps, remaining } = run(
      stepBlock({ id: "done", i18nKey: "step.firehose", done: true }) + partial
    );
    expect(steps.map((s) => s.id)).toEqual(["done"]);
    expect(remaining).toBe(partial);
  });
});

const textBlock = (text: string) => `data: ${text}\n\n`;

/**
 * Stub global fetch with a Response whose body streams the given SSE chunks.
 * The hook only reads `ok` and `body.getReader().read()`, so a hand-rolled
 * reader is enough — no real ReadableStream needed.
 */
function mockFetchSSE(chunks: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  const reader = {
    read: async () =>
      i < chunks.length
        ? { done: false as const, value: encoder.encode(chunks[i++]) }
        : { done: true as const, value: undefined },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, body: { getReader: () => reader } })
  );
}

/** Run one stream() to completion inside act() and return the hook handle. */
async function drive(
  result: { current: ReturnType<typeof useStreamingExplain> },
  chunks: string[]
) {
  mockFetchSSE(chunks);
  await act(async () => {
    await result.current.stream({
      workspaceId: "w1",
      feature: "explain_finding",
      findingId: "f1",
    });
  });
}

describe("useStreamingExplain — step reducers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dedupes a re-emitted step id", async () => {
    const { result } = renderHook(() => useStreamingExplain());
    await drive(result, [
      stepBlock({ id: "a", i18nKey: "step.brokerRead", done: false }),
      stepBlock({ id: "a", i18nKey: "step.brokerRead", done: false }),
    ]);
    expect(result.current.steps).toHaveLength(1);
    expect(result.current.steps[0].id).toBe("a");
  });

  it("completes the prior step when a new step arrives", async () => {
    const { result } = renderHook(() => useStreamingExplain());
    await drive(result, [
      stepBlock({ id: "a", i18nKey: "step.brokerRead", done: false }),
      stepBlock({ id: "b", i18nKey: "step.firehose", done: false }),
    ]);
    expect(result.current.steps.map((s) => [s.id, s.done])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });

  it("completes the active step on the first text chunk", async () => {
    const { result } = renderHook(() => useStreamingExplain());
    await drive(result, [
      stepBlock({ id: "a", i18nKey: "step.brokerRead", done: false }),
      textBlock("Hello world"),
    ]);
    expect(result.current.text).toBe("Hello world");
    expect(result.current.steps).toEqual([
      { id: "a", i18nKey: "step.brokerRead", done: true },
    ]);
  });

  it("clears steps on reset()", async () => {
    const { result } = renderHook(() => useStreamingExplain());
    await drive(result, [
      stepBlock({ id: "a", i18nKey: "step.brokerRead", done: false }),
    ]);
    expect(result.current.steps).toHaveLength(1);
    act(() => result.current.reset());
    expect(result.current.steps).toEqual([]);
  });

  it("clears stale steps when a fresh stream starts", async () => {
    const { result } = renderHook(() => useStreamingExplain());
    await drive(result, [
      stepBlock({ id: "a", i18nKey: "step.brokerRead", done: false }),
    ]);
    expect(result.current.steps).toHaveLength(1);
    // Second stream emits no steps — the start-of-stream reset must wipe the
    // prior run's checklist rather than leaving stale checkmarks behind.
    await drive(result, [textBlock("Fresh answer")]);
    expect(result.current.steps).toEqual([]);
    expect(result.current.text).toBe("Fresh answer");
  });
});
