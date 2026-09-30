// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

// The CE mirror ships without apps/api/src/ee/. This page must still resolve
// every import there, or `vite build` (and the apps/app Docker image) fails.
describe("Explanation page", () => {
  it("loads whether or not the EE context builders are on disk", async () => {
    const mod = await import("./Explanation");
    expect(typeof mod.default).toBe("function");
  });
});
