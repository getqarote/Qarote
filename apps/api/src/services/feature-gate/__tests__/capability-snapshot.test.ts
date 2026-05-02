/**
 * Tests for the capability snapshot helpers — schema-version guard,
 * override merge, and parse defensiveness.
 */

import { describe, expect, it } from "vitest";

import {
  applyCapabilityOverride,
  CAPABILITY_SCHEMA_VERSION,
  type CapabilitySnapshot,
  parseCapabilitySnapshot,
} from "@/services/feature-gate/capability-snapshot";

import type { Prisma } from "@/generated/prisma/client";

const VALID: CapabilitySnapshot = {
  schemaVersion: CAPABILITY_SCHEMA_VERSION,
  enabledPlugins: ["rabbitmq_management", "rabbitmq_tracing"],
  hasFirehoseExchange: true,
  detectedAt: "2026-04-29T10:00:00.000Z",
};

// Cast helper — tests run snapshot data through the parse path which
// expects Prisma's JsonValue. The runtime shape is identical; this is a
// type-level workaround to avoid sprinkling `as` everywhere.
const asJson = (v: unknown): Prisma.JsonValue =>
  v as unknown as Prisma.JsonValue;

describe("parseCapabilitySnapshot", () => {
  it("accepts a well-formed snapshot at the current schema version", () => {
    expect(parseCapabilitySnapshot(asJson(VALID))).toEqual(VALID);
  });

  it("returns null for null/undefined", () => {
    expect(parseCapabilitySnapshot(null)).toBeNull();
    expect(parseCapabilitySnapshot(undefined)).toBeNull();
  });

  it("returns null for non-object inputs (defends against malformed JSON)", () => {
    expect(parseCapabilitySnapshot("string")).toBeNull();
    expect(parseCapabilitySnapshot(42)).toBeNull();
    expect(parseCapabilitySnapshot([])).toBeNull();
  });

  it("returns null when schemaVersion is too high (future write, old reader)", () => {
    expect(
      parseCapabilitySnapshot(asJson({ ...VALID, schemaVersion: 99 }))
    ).toBeNull();
  });

  it("returns null when required fields are missing or wrong type", () => {
    // Build the missing-field fixture explicitly rather than via
    // destructuring + an unused-rename — `_` triggers
    // @typescript-eslint/no-unused-vars in this repo's config and a
    // plain `delete` on a clone reads cleanly.
    const withoutFirehose: Record<string, unknown> = { ...VALID };
    delete withoutFirehose.hasFirehoseExchange;
    expect(parseCapabilitySnapshot(asJson(withoutFirehose))).toBeNull();
    expect(
      parseCapabilitySnapshot(asJson({ ...VALID, enabledPlugins: "oops" }))
    ).toBeNull();
  });
});

describe("applyCapabilityOverride", () => {
  it("returns null when detected snapshot is null (no override can save us)", () => {
    expect(
      applyCapabilityOverride(null, { hasFirehoseExchange: true })
    ).toBeNull();
  });

  it("returns the detected snapshot unchanged when override is null/undefined", () => {
    expect(applyCapabilityOverride(VALID, null)).toEqual(VALID);
    expect(applyCapabilityOverride(VALID, undefined)).toEqual(VALID);
  });

  it("returns the detected snapshot unchanged when override is non-object", () => {
    expect(applyCapabilityOverride(VALID, "noop")).toEqual(VALID);
    expect(applyCapabilityOverride(VALID, [])).toEqual(VALID);
  });

  it("merges scalar overrides on top of detected values (override wins)", () => {
    const detected: CapabilitySnapshot = {
      ...VALID,
      hasFirehoseExchange: false,
    };
    const result = applyCapabilityOverride(detected, {
      hasFirehoseExchange: true,
    });
    expect(result?.hasFirehoseExchange).toBe(true);
    // Other detected fields preserved.
    expect(result?.enabledPlugins).toEqual(detected.enabledPlugins);
  });

  it("merges array overrides verbatim (replace, not concat)", () => {
    const result = applyCapabilityOverride(VALID, {
      enabledPlugins: ["rabbitmq_event_exchange"],
    });
    expect(result?.enabledPlugins).toEqual(["rabbitmq_event_exchange"]);
  });
});
