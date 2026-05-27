/**
 * Route-level auth gate for the MCP endpoint. The transport bridge needs raw
 * Node req/res, but the two rejection paths return before it — so they are
 * exercised here with Hono's request helper and a mocked resolver, asserting
 * the route fails closed before any tool session is built.
 */

import { describe, expect, it, vi } from "vitest";

const { mockResolve } = vi.hoisted(() => ({ mockResolve: vi.fn() }));

vi.mock("@/auth/resolve-api-key", () => ({
  resolveApiKeyAuth: mockResolve,
}));

vi.mock("@/core/prisma", () => ({ prisma: {} }));

import { mcpRouter } from "@/mcp/route";

describe("MCP route auth gate", () => {
  it("returns 401 when the x-api-key header is missing", async () => {
    const res = await mcpRouter.request("/", { method: "POST" });
    expect(res.status).toBe(401);
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("returns 401 when the key does not resolve to a workspace", async () => {
    mockResolve.mockResolvedValue(null);
    const res = await mcpRouter.request("/", {
      method: "POST",
      headers: { "x-api-key": "bad" },
    });
    expect(res.status).toBe(401);
    expect(mockResolve).toHaveBeenCalledWith("bad");
  });
});
