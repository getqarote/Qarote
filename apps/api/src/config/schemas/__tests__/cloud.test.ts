/**
 * Cloud schema — INTERNAL_NOTIFICATION_EMAIL normalisation.
 *
 * The invariant is narrow but load-bearing: the deploy workflows expand an
 * unset GitHub variable to an empty string, so "blank" MUST mean "feature off"
 * rather than "invalid config". Without the normalisation, the default state
 * (no recipient configured) fails config parsing and takes the API down at
 * boot. The last case pins the other half — normalising blanks must not turn
 * into accepting anything.
 */

import { describe, expect, it } from "vitest";

import { cloudSchema } from "../cloud";

const parse = (value: unknown) =>
  cloudSchema.shape.INTERNAL_NOTIFICATION_EMAIL.safeParse(value);

describe("cloudSchema INTERNAL_NOTIFICATION_EMAIL", () => {
  it("treats an omitted value as unset", () => {
    const result = parse(undefined);
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("treats an empty string as unset, not as invalid config", () => {
    const result = parse("");
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("treats a whitespace-only value as unset", () => {
    const result = parse("   ");
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("accepts a valid address", () => {
    const result = parse("ops@qarote.io");
    expect(result.success).toBe(true);
    expect(result.data).toBe("ops@qarote.io");
  });

  it("still rejects a malformed address", () => {
    expect(parse("not-an-email").success).toBe(false);
  });
});
