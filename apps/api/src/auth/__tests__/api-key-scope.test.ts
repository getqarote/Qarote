import { describe, expect, it } from "vitest";

import {
  apiKeyMutationBlocked,
  type ApiKeyScope,
  apiKeyWorkspaceMismatch,
  parseApiKeyScope,
} from "@/auth/api-key-scope";

describe("parseApiKeyScope", () => {
  it("parses a valid read scope", () => {
    expect(
      parseApiKeyScope({ workspaceId: "ws_1", mode: "read", v: 1 })
    ).toEqual({ workspaceId: "ws_1", mode: "read", v: 1 });
  });

  it("parses explain mode and defaults v when absent", () => {
    expect(parseApiKeyScope({ workspaceId: "ws_1", mode: "explain" })).toEqual({
      workspaceId: "ws_1",
      mode: "explain",
      v: 1,
    });
  });

  it("defaults v to 1 when present but not a number", () => {
    expect(
      parseApiKeyScope({ workspaceId: "ws_1", mode: "read", v: "2" })
    ).toEqual({ workspaceId: "ws_1", mode: "read", v: 1 });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "ws_1"],
    ["a number", 42],
    ["an array", ["ws_1"]],
    ["missing workspaceId", { mode: "read" }],
    ["empty workspaceId", { workspaceId: "", mode: "read" }],
    ["non-string workspaceId", { workspaceId: 1, mode: "read" }],
    ["invalid mode", { workspaceId: "ws_1", mode: "write" }],
    ["missing mode", { workspaceId: "ws_1" }],
  ])("returns null for %s (fail closed)", (_label, input) => {
    expect(parseApiKeyScope(input)).toBeNull();
  });
});

const readScope: ApiKeyScope = { workspaceId: "ws_1", mode: "read", v: 1 };
const explainScope: ApiKeyScope = {
  workspaceId: "ws_1",
  mode: "explain",
  v: 1,
};

describe("apiKeyMutationBlocked (read-only floor)", () => {
  it.each([
    ["read", "query", false],
    ["read", "mutation", true],
    ["read", "subscription", true],
    // explain is NOT a write grant — it only unlocks the explain capability at
    // the tool layer, so explain keys are still blocked from tRPC mutations.
    ["explain", "query", false],
    ["explain", "mutation", true],
    ["explain", "subscription", true],
  ] as const)("%s key + %s -> blocked=%s", (mode, op, blocked) => {
    const scope = mode === "read" ? readScope : explainScope;
    expect(apiKeyMutationBlocked(scope, op)).toBe(blocked);
  });

  it.each(["query", "mutation", "subscription"] as const)(
    "never blocks a non-API-key request (scope null/undefined) on %s",
    (op) => {
      expect(apiKeyMutationBlocked(null, op)).toBe(false);
      expect(apiKeyMutationBlocked(undefined, op)).toBe(false);
    }
  );
});

describe("apiKeyWorkspaceMismatch", () => {
  it("allows the workspace the key is bound to", () => {
    expect(apiKeyWorkspaceMismatch(readScope, "ws_1")).toBe(false);
  });

  it("blocks a different workspace (even one the creator also belongs to)", () => {
    expect(apiKeyWorkspaceMismatch(readScope, "ws_2")).toBe(true);
  });

  it("never blocks a non-API-key request (scope null/undefined)", () => {
    expect(apiKeyWorkspaceMismatch(null, "ws_anything")).toBe(false);
    expect(apiKeyWorkspaceMismatch(undefined, "ws_anything")).toBe(false);
  });
});
