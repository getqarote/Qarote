// @vitest-environment jsdom
/**
 * Tests for the one-shot delete→first-run handoff. The contract has clear
 * pass/fail boundaries (present-and-fresh / missing / malformed / expired /
 * already-consumed), so each is pinned here — a regression would silently
 * mislabel the first-run cockpit.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  consumeLastRemovedServer,
  recordLastRemovedServer,
} from "./lastRemovedServer";

const KEY = "qarote:lastRemovedServer";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("lastRemovedServer", () => {
  it("returns the name for a freshly recorded server", () => {
    recordLastRemovedServer("prod-east");
    expect(consumeLastRemovedServer()).toBe("prod-east");
  });

  it("returns null when nothing was recorded", () => {
    expect(consumeLastRemovedServer()).toBeNull();
  });

  it("clears the record so the second read is null (consume-once)", () => {
    recordLastRemovedServer("prod-east");
    expect(consumeLastRemovedServer()).toBe("prod-east");
    expect(consumeLastRemovedServer()).toBeNull();
  });

  it("returns null and clears a malformed record", () => {
    window.sessionStorage.setItem(KEY, "not-json{");
    expect(consumeLastRemovedServer()).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it("returns null for a record older than the TTL", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000_000);
    recordLastRemovedServer("prod-east");
    // 61s later — past the 60s TTL.
    nowSpy.mockReturnValue(1_000_000 + 61_000);
    expect(consumeLastRemovedServer()).toBeNull();
  });

  it("returns the name for a record within the TTL", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000_000);
    recordLastRemovedServer("prod-east");
    // 59s later — still inside the 60s window.
    nowSpy.mockReturnValue(1_000_000 + 59_000);
    expect(consumeLastRemovedServer()).toBe("prod-east");
  });
});
