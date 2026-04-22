import { describe, expect, it } from "vitest";

import { CreateOrUpdatePolicySchema, DeletePolicySchema } from "../rabbitmq.js";

// ---------------------------------------------------------------------------
// CreateOrUpdatePolicySchema
// ---------------------------------------------------------------------------

describe("CreateOrUpdatePolicySchema", () => {
  const validBase = {
    name: "test-policy",
    pattern: ".*",
    applyTo: "all" as const,
    definition: { "max-length": 10000 },
    priority: 0,
  };

  it("accepts a well-formed policy", () => {
    const result = CreateOrUpdatePolicySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  // ── name ──────────────────────────────────────────────────────────────────

  it("rejects an empty name", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      name: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("trims leading/trailing whitespace from name", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      name: "  my-policy  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("my-policy");
    }
  });

  // ── pattern ───────────────────────────────────────────────────────────────

  it("rejects an empty pattern", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      pattern: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only pattern", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      pattern: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("trims leading/trailing whitespace from pattern", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      pattern: "  ^orders\\.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pattern).toBe("^orders\\.");
    }
  });

  // ── definition ────────────────────────────────────────────────────────────

  it("rejects an empty definition object", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      definition: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => /at least one key/i.test(m))).toBe(true);
    }
  });

  it("accepts a definition with one key", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      definition: { "message-ttl": 60000 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a definition with multiple keys", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      definition: {
        "max-length": 1000,
        overflow: "drop-head",
        "dead-letter-exchange": "dlx",
      },
    });
    expect(result.success).toBe(true);
  });

  // ── priority ──────────────────────────────────────────────────────────────

  it("accepts priority 0 (minimum)", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      priority: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts priority 1_000_000 (maximum)", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      priority: 1_000_000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects priority above 1_000_000", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      priority: 1_000_001,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative priority", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      priority: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer priority", () => {
    const result = CreateOrUpdatePolicySchema.safeParse({
      ...validBase,
      priority: 1.5,
    });
    expect(result.success).toBe(false);
  });

  // ── applyTo ───────────────────────────────────────────────────────────────

  it("accepts applyTo: queues", () => {
    expect(
      CreateOrUpdatePolicySchema.safeParse({ ...validBase, applyTo: "queues" })
        .success
    ).toBe(true);
  });

  it("accepts applyTo: exchanges", () => {
    expect(
      CreateOrUpdatePolicySchema.safeParse({
        ...validBase,
        applyTo: "exchanges",
      }).success
    ).toBe(true);
  });

  it("accepts applyTo: all", () => {
    expect(
      CreateOrUpdatePolicySchema.safeParse({ ...validBase, applyTo: "all" })
        .success
    ).toBe(true);
  });

  it("rejects an invalid applyTo value", () => {
    expect(
      CreateOrUpdatePolicySchema.safeParse({
        ...validBase,
        applyTo: "invalid",
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DeletePolicySchema
// ---------------------------------------------------------------------------

describe("DeletePolicySchema", () => {
  it("accepts a valid policy name", () => {
    const result = DeletePolicySchema.safeParse({ policyName: "my-policy" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty policy name", () => {
    const result = DeletePolicySchema.safeParse({ policyName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only policy name", () => {
    const result = DeletePolicySchema.safeParse({ policyName: "   " });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from policy name", () => {
    const result = DeletePolicySchema.safeParse({
      policyName: "  my-policy  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.policyName).toBe("my-policy");
    }
  });
});
