/**
 * Pure-function tests for `isScopeSubsumed` — the same-kind-only
 * subset check (plan §4.3). The full anti-escalation contract is
 * exercised via `assertCanGrantCustomRole` tests; these pin the
 * subsumption primitive against the edge cases the plan calls out.
 */

import { describe, expect, it } from "vitest";

import { type ScopeJson } from "@/auth/scope-canonical";
import { isScopeSubsumed } from "@/auth/workspace-roles";

describe("isScopeSubsumed", () => {
  it("null candidate is admitted only by a null holder", () => {
    expect(isScopeSubsumed(null, [null])).toBe(true);
    expect(isScopeSubsumed(null, [{ kind: "server.id", ids: ["X"] }])).toBe(
      false
    );
    // Mix of holders — only the null one matters for null candidate.
    expect(
      isScopeSubsumed(null, [{ kind: "server.id", ids: ["X"] }, null])
    ).toBe(true);
  });

  it("null holder admits anything (unconditional grant)", () => {
    const cand: ScopeJson = { kind: "server.id", ids: ["X"] };
    expect(isScopeSubsumed(cand, [null])).toBe(true);
  });

  it("server.id: candidate ids must be a subset of some holder's ids", () => {
    const holder: ScopeJson = { kind: "server.id", ids: ["A", "B", "C"] };
    expect(isScopeSubsumed({ kind: "server.id", ids: ["A"] }, [holder])).toBe(
      true
    );
    expect(
      isScopeSubsumed({ kind: "server.id", ids: ["A", "B"] }, [holder])
    ).toBe(true);
    expect(
      isScopeSubsumed({ kind: "server.id", ids: ["A", "D"] }, [holder])
    ).toBe(false);
  });

  it("server.environment: candidate values must be a subset of holder's values", () => {
    const holder: ScopeJson = {
      kind: "server.environment",
      values: ["staging", "dev"],
    };
    expect(
      isScopeSubsumed({ kind: "server.environment", values: ["dev"] }, [holder])
    ).toBe(true);
    expect(
      isScopeSubsumed(
        { kind: "server.environment", values: ["dev", "staging"] },
        [holder]
      )
    ).toBe(true);
    expect(
      isScopeSubsumed({ kind: "server.environment", values: ["prod"] }, [
        holder,
      ])
    ).toBe(false);
  });

  it("same-kind only — server.id vs server.environment are independent", () => {
    // Holder scoped to staging by name; candidate naming server-id `staging`
    // is NOT subsumed even if the id string happens to equal an env name.
    const holder: ScopeJson = {
      kind: "server.environment",
      values: ["staging"],
    };
    const cand: ScopeJson = { kind: "server.id", ids: ["staging"] };
    expect(isScopeSubsumed(cand, [holder])).toBe(false);
  });

  it("OR-across-holders: any one match is sufficient", () => {
    const cand: ScopeJson = { kind: "server.id", ids: ["A"] };
    const holders: Array<ScopeJson | null> = [
      { kind: "server.environment", values: ["prod"] },
      { kind: "server.id", ids: ["A", "B"] },
    ];
    expect(isScopeSubsumed(cand, holders)).toBe(true);
  });

  it("empty holder list rejects any candidate", () => {
    expect(isScopeSubsumed(null, [])).toBe(false);
    expect(isScopeSubsumed({ kind: "server.id", ids: ["X"] }, [])).toBe(false);
  });

  it("plan §4.3 example: staging-scoped holder cannot grant unconditional", () => {
    // The whole reason this primitive exists: a holder of `queue:purge`
    // scoped to staging cannot create a role with `queue:purge` scoped
    // to null (unconditional), because no held row has null scope for
    // that key.
    const holder: ScopeJson = {
      kind: "server.environment",
      values: ["staging"],
    };
    expect(isScopeSubsumed(null, [holder])).toBe(false);
  });
});
