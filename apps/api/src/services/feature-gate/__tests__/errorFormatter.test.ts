/**
 * End-to-end test of the gate-aware errorFormatter.
 *
 * Stands up a minimal tRPC instance with the same `errorFormatter` shape
 * used by the production root tRPC (`apps/api/src/trpc/trpc.ts`) and
 * exercises:
 *   1. a procedure that throws via `throwGateError` → the wire shape
 *      surfaces `data.gate`.
 *   2. a procedure that throws a regular `TRPCError` → the wire shape is
 *      unchanged (no `gate` key).
 *   3. recursive cause walking — a middleware that catches and re-throws
 *      a gate error wrapped in another `TRPCError`.
 *
 * We test the formatter in isolation (not through HTTP) because that is
 * sufficient to verify the wire contract — tRPC's HTTP layer simply
 * stringifies whatever the formatter returns.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import type { BlockedGate } from "@/services/feature-gate";
import {
  extractGatePayload,
  throwGateError,
} from "@/services/feature-gate/error";

const SAMPLE_GATE: BlockedGate = {
  kind: "blocked",
  blockedBy: "license",
  feature: "alerting",
  reasonKey: "license.featureRequiresLicense",
  reasonParams: { feature: "alerting" },
  upgrade: {
    ctaKey: "license.cta.activate",
    ctaUrl: "/settings/license",
  },
};

const t = initTRPC.create({
  errorFormatter({ shape, error }) {
    try {
      const gate = extractGatePayload(error);
      if (!gate) return shape;
      const baseData =
        shape.data && typeof shape.data === "object" ? shape.data : {};
      return { ...shape, data: { ...baseData, gate } };
    } catch {
      return shape;
    }
  },
});

const router = t.router({
  blocked: t.procedure.query(() => {
    throwGateError(SAMPLE_GATE);
  }),
  rewrapped: t.procedure.query(() => {
    // Simulate a downstream middleware that wraps the gate error.
    try {
      throwGateError(SAMPLE_GATE);
    } catch (cause) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "downstream wrapped me",
        cause: cause as Error,
      });
    }
  }),
  vanilla: t.procedure.query(() => {
    throw new TRPCError({ code: "NOT_FOUND", message: "nope" });
  }),
});

const caller = router.createCaller({});

async function getErrorShape(call: () => Promise<unknown>) {
  try {
    await call();
    throw new Error("expected procedure to throw");
  } catch (err) {
    if (!(err instanceof TRPCError)) throw err;
    // Reconstruct what the wire would carry: tRPC builds shape via the
    // formatter we registered; calling getErrorShape directly mirrors HTTP.
    const proc = (router as unknown as { _def: { _config: typeof t._config } })
      ._def._config;
    const shape = proc.errorFormatter({
      error: err,
      shape: {
        message: err.message,
        code: err.code,
        data: { code: err.code, httpStatus: 0, path: "test" },
      } as never,
      type: "query",
      path: "test",
      input: undefined,
      ctx: {},
    });
    return shape as { data?: { gate?: unknown } };
  }
}

describe("gate-aware errorFormatter — wire contract", () => {
  it("blocked gate surfaces shape.data.gate with the structured payload", async () => {
    const shape = await getErrorShape(() => caller.blocked());
    expect(shape.data?.gate).toMatchObject({
      blockedBy: "license",
      feature: "alerting",
      reasonKey: "license.featureRequiresLicense",
    });
  });

  it("regular TRPCError leaves shape.data.gate undefined", async () => {
    const shape = await getErrorShape(() => caller.vanilla());
    expect(shape.data?.gate).toBeUndefined();
  });

  it("re-wrapped gate error still surfaces via recursive cause walk", async () => {
    const shape = await getErrorShape(() => caller.rewrapped());
    expect(shape.data?.gate).toMatchObject({
      blockedBy: "license",
      feature: "alerting",
    });
  });
});
