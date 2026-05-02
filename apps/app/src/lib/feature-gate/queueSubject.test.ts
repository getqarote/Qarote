/**
 * Tests for the `queueSubject` helper — the layer that translates a
 * domain-language `queueType` into the gate's `GateSubject` shape.
 */

import { describe, expect, it } from "vitest";

import { queueSubject } from "./types";

describe("queueSubject", () => {
  it("returns undefined when queueType is undefined (queue not loaded yet)", () => {
    expect(queueSubject(undefined)).toBeUndefined();
  });

  it("wraps a known queueType into a GateSubject", () => {
    expect(queueSubject("classic")).toEqual({
      kind: "queue",
      queueType: "classic",
    });
    expect(queueSubject("quorum")).toEqual({
      kind: "queue",
      queueType: "quorum",
    });
    expect(queueSubject("stream")).toEqual({
      kind: "queue",
      queueType: "stream",
    });
  });
});
