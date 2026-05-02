/**
 * Error transport tests — verify that throwGateError + extractGatePayload
 * round-trip the structured payload, and that the wire shape is stable.
 */

import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import type { BlockedGate } from "@/services/feature-gate";
import {
  extractGatePayload,
  FEATURE_GATE_ERROR_SENTINEL,
  throwGateError,
} from "@/services/feature-gate";

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

describe("throwGateError + extractGatePayload", () => {
  it("throws a TRPCError with the sentinel message and the payload on cause", () => {
    expect(() => throwGateError(SAMPLE_GATE)).toThrow(TRPCError);
    try {
      throwGateError(SAMPLE_GATE);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).message).toBe(FEATURE_GATE_ERROR_SENTINEL);
      const payload = extractGatePayload(e);
      expect(payload).toBeDefined();
      expect(payload?.blockedBy).toBe("license");
      expect(payload?.feature).toBe("alerting");
      expect(payload?.reasonKey).toBe("license.featureRequiresLicense");
      expect(payload?.upgrade?.ctaUrl).toBe("/settings/license");
    }
  });

  it("uses PRECONDITION_FAILED for capability blocks and FORBIDDEN otherwise", () => {
    try {
      throwGateError({
        kind: "blocked",
        blockedBy: "capability",
        feature: "message_tracing",
        reasonKey: "capability.tracing.pluginMissing",
      });
    } catch (e) {
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
    }

    try {
      throwGateError(SAMPLE_GATE);
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }

    try {
      throwGateError({
        kind: "blocked",
        blockedBy: "plan",
        feature: "sso",
        reasonKey: "plan.featureRequiresUpgrade",
      });
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("returns undefined when extractGatePayload sees a non-gate TRPCError", () => {
    const error = new TRPCError({ code: "NOT_FOUND", message: "nope" });
    expect(extractGatePayload(error)).toBeUndefined();
  });

  it("returns undefined for non-TRPCError throwables", () => {
    expect(extractGatePayload(new Error("boom"))).toBeUndefined();
    expect(extractGatePayload("string")).toBeUndefined();
    expect(extractGatePayload(null)).toBeUndefined();
  });
});
