/**
 * Fixture-driven tests for the resource-scope evaluator.
 *
 * The evaluator is exercised here before any custom roles exist
 * (per plan §8.2). PR-3 wires it into the `workspacePermissionProcedure`
 * middleware via `resourceCtxFn`; this file pins the contract.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  evaluateScope,
  type ResourceCtx,
  type ScopeJson,
  type ScopeRow,
} from "@/auth/scope-evaluator";

// Public-type usage anchors for knip — both will be consumed by PR-3
// when `workspacePermissionProcedure(key, resourceCtxFn)` wires
// scope evaluation into the middleware.
type _AnchorResourceCtx = ResourceCtx;
type _AnchorScopeJson = ScopeJson;

function row(scopeJson: unknown, fingerprint = "fp"): ScopeRow {
  return { scopeJson, scopeFingerprint: fingerprint };
}

describe("evaluateScope", () => {
  it("returns false when there are no scope rows (no grant)", () => {
    expect(evaluateScope([], { serverId: "X" })).toBe(false);
  });

  it("a null-scope row admits any resource (unscoped grant)", () => {
    expect(evaluateScope([row(null)], { serverId: "X" })).toBe(true);
    expect(evaluateScope([row(null)], { serverEnvironment: "prod" })).toBe(
      true
    );
  });

  it("server.id: admits when serverId is in the ids list", () => {
    const rows = [row({ kind: "server.id", ids: ["X", "Y"] })];
    expect(evaluateScope(rows, { serverId: "X" })).toBe(true);
    expect(evaluateScope(rows, { serverId: "Y" })).toBe(true);
    expect(evaluateScope(rows, { serverId: "Z" })).toBe(false);
  });

  it("server.id: fails closed when ctx has no serverId", () => {
    const rows = [row({ kind: "server.id", ids: ["X"] })];
    expect(evaluateScope(rows, {})).toBe(false);
  });

  it("server.environment: admits when serverEnvironment matches values", () => {
    const rows = [
      row({ kind: "server.environment", values: ["staging", "dev"] }),
    ];
    expect(evaluateScope(rows, { serverEnvironment: "staging" })).toBe(true);
    expect(evaluateScope(rows, { serverEnvironment: "dev" })).toBe(true);
    expect(evaluateScope(rows, { serverEnvironment: "prod" })).toBe(false);
  });

  it("OR-across-rows: any row admitting → permission held", () => {
    const rows = [
      row({ kind: "server.id", ids: ["X"] }),
      row({ kind: "server.environment", values: ["prod"] }),
    ];
    expect(evaluateScope(rows, { serverId: "X" })).toBe(true);
    expect(
      evaluateScope(rows, { serverId: "Z", serverEnvironment: "prod" })
    ).toBe(true);
    expect(
      evaluateScope(rows, { serverId: "Z", serverEnvironment: "dev" })
    ).toBe(false);
  });

  it("empty ids array fails closed (DB-side tamper protection)", () => {
    const rows = [row({ kind: "server.id", ids: [] })];
    expect(evaluateScope(rows, { serverId: "X" })).toBe(false);
  });

  it("empty values array fails closed", () => {
    const rows = [row({ kind: "server.environment", values: [] })];
    expect(evaluateScope(rows, { serverEnvironment: "prod" })).toBe(false);
  });

  it("unknown kind fails closed (future scope kinds + tamper)", () => {
    const rows = [row({ kind: "server.region", values: ["us-east"] })];
    expect(evaluateScope(rows, { serverEnvironment: "us-east" })).toBe(false);
  });

  it("malformed scopeJson (no kind) fails closed", () => {
    expect(evaluateScope([row({ random: "shape" })], { serverId: "X" })).toBe(
      false
    );
    expect(evaluateScope([row("just a string")], { serverId: "X" })).toBe(
      false
    );
    expect(evaluateScope([row(42)], { serverId: "X" })).toBe(false);
  });

  it("a null-scope row in a list of others still triggers admit", () => {
    const rows = [
      row({ kind: "server.id", ids: ["X"] }),
      row(null), // global grant
    ];
    expect(evaluateScope(rows, { serverId: "Z" })).toBe(true);
  });
});
