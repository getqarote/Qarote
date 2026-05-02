/**
 * Tests for the wire-shape extractor that pulls the structured gate
 * payload off a thrown tRPC error. The contract is critical: any
 * shape change breaks the visual surfaces consuming `<FeatureGateCard>`.
 */

import { describe, expect, it } from "vitest";

import { readGateError, toBlockedGate } from "./readGateError";

describe("readGateError", () => {
  it("extracts a well-formed gate payload from data.gate", () => {
    const err = {
      data: {
        gate: {
          blockedBy: "license",
          feature: "alerting",
          reasonKey: "license.featureRequiresLicense",
        },
      },
    };
    const result = readGateError(err);
    expect(result?.blockedBy).toBe("license");
    expect(result?.feature).toBe("alerting");
  });

  it("returns null for null / undefined / non-objects", () => {
    expect(readGateError(null)).toBeNull();
    expect(readGateError(undefined)).toBeNull();
    expect(readGateError("string error")).toBeNull();
    expect(readGateError(42)).toBeNull();
  });

  it("returns null when data is missing or null (defends against fetch errors)", () => {
    expect(readGateError({})).toBeNull();
    expect(readGateError({ data: null })).toBeNull();
    expect(readGateError({ data: undefined })).toBeNull();
  });

  it("returns null when data.gate is malformed (missing required fields)", () => {
    expect(readGateError({ data: { gate: {} } })).toBeNull();
    expect(
      readGateError({ data: { gate: { blockedBy: "license" } } })
    ).toBeNull();
    expect(
      readGateError({
        data: { gate: { blockedBy: "license", feature: 42 } },
      })
    ).toBeNull();
  });

  it("preserves optional fields (remediation, upgrade, fallback)", () => {
    const err = {
      data: {
        gate: {
          blockedBy: "capability",
          feature: "message_tracing",
          reasonKey: "capability.tracing.pluginMissing",
          remediation: {
            docsUrl: "/docs/foo",
            ctaKey: "capability.tracing.enablePlugin",
            commands: ["rabbitmq-plugins enable rabbitmq_tracing"],
          },
          fallback: {
            feature: "message_spy",
            reasonKey: "capability.message_tracing.fallbackTo.message_spy",
          },
        },
      },
    };
    const result = readGateError(err);
    expect(result?.remediation?.commands).toEqual([
      "rabbitmq-plugins enable rabbitmq_tracing",
    ]);
    expect(result?.fallback?.feature).toBe("message_spy");
  });
});

describe("toBlockedGate", () => {
  it("wraps a wire payload into the BlockedGate discriminated shape", () => {
    const payload = {
      blockedBy: "plan" as const,
      feature: "sso" as const,
      reasonKey: "plan.featureRequiresUpgrade",
    };
    const gate = toBlockedGate(payload);
    expect(gate.kind).toBe("blocked");
    expect(gate.feature).toBe("sso");
  });
});
