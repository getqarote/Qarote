/**
 * Parity tests for `canonicalizeScope` / `scopeFingerprint`.
 *
 * The fingerprint we compute in TypeScript MUST match what Postgres
 * computes via `encode(digest(coalesce(scopeCanonical, ''), 'sha256'),
 * 'hex')` on the same canonical string — otherwise an INSERT that
 * passes the app-side de-dup check could still collide on the partial
 * unique index, or vice versa.
 *
 * These tests pin the canonical string format directly (so we'd
 * notice if `canonicalizeScope` accidentally changed serialization
 * order) AND the SHA-256 hex (so a refactor to a different hashing
 * primitive would fail loudly).
 *
 * If a future scope kind is added, this file must grow a fixture
 * pair for it in the same PR.
 */

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  canonicalizeScope,
  scopeFingerprint,
  type ScopeJson,
  ScopeJsonSchema,
} from "@/auth/scope-canonical";

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("canonicalizeScope", () => {
  it("returns null for null input (caller passes through to DB)", () => {
    expect(canonicalizeScope(null)).toBeNull();
  });

  it("server.id: sorts and dedupes ids deterministically", () => {
    const scope: ScopeJson = {
      kind: "server.id",
      ids: [
        "11111111-1111-4111-8111-111111111111",
        "00000000-0000-4000-8000-000000000000",
        "11111111-1111-4111-8111-111111111111",
      ],
    };
    expect(canonicalizeScope(scope)).toBe(
      '{"kind":"server.id","ids":["00000000-0000-4000-8000-000000000000","11111111-1111-4111-8111-111111111111"]}'
    );
  });

  it("server.id: insertion order does not affect canonical text", () => {
    const a: ScopeJson = {
      kind: "server.id",
      ids: [
        "11111111-1111-4111-8111-111111111111",
        "00000000-0000-4000-8000-000000000000",
      ],
    };
    const b: ScopeJson = {
      kind: "server.id",
      ids: [
        "00000000-0000-4000-8000-000000000000",
        "11111111-1111-4111-8111-111111111111",
      ],
    };
    expect(canonicalizeScope(a)).toBe(canonicalizeScope(b));
  });

  it("server.environment: sorts and dedupes values deterministically", () => {
    const scope: ScopeJson = {
      kind: "server.environment",
      values: ["prod", "dev", "staging", "dev"],
    };
    expect(canonicalizeScope(scope)).toBe(
      '{"kind":"server.environment","values":["dev","prod","staging"]}'
    );
  });
});

describe("scopeFingerprint", () => {
  it("null scope hashes to sha256('')", () => {
    expect(scopeFingerprint(null)).toBe(sha256Hex(""));
  });

  it("server.id fingerprint matches sha256(canonicalText)", () => {
    const scope: ScopeJson = {
      kind: "server.id",
      ids: ["00000000-0000-4000-8000-000000000000"],
    };
    const canonical = canonicalizeScope(scope) ?? "";
    expect(scopeFingerprint(scope)).toBe(sha256Hex(canonical));
  });

  it("scope-equivalent inputs produce equal fingerprints regardless of order", () => {
    const a: ScopeJson = {
      kind: "server.environment",
      values: ["prod", "staging"],
    };
    const b: ScopeJson = {
      kind: "server.environment",
      values: ["staging", "prod"],
    };
    expect(scopeFingerprint(a)).toBe(scopeFingerprint(b));
  });

  it("different kinds with the same string content fingerprint distinctly", () => {
    const a: ScopeJson = { kind: "server.id", ids: ["prod"] as never };
    const b: ScopeJson = { kind: "server.environment", values: ["prod"] };
    // `a` is technically invalid (ids should be uuids) but we're only
    // exercising the canonicalizer here, not the Zod validator.
    expect(scopeFingerprint(a)).not.toBe(scopeFingerprint(b));
  });
});

describe("ScopeJsonSchema (Zod validator at write time)", () => {
  it("accepts valid server.id", () => {
    const parsed = ScopeJsonSchema.parse({
      kind: "server.id",
      ids: ["00000000-0000-4000-8000-000000000000"],
    });
    expect(parsed.kind).toBe("server.id");
  });

  it("rejects unknown kind", () => {
    expect(() =>
      ScopeJsonSchema.parse({ kind: "server.region", values: ["us-east"] })
    ).toThrow();
  });

  it("rejects empty ids array (fail-closed at write time)", () => {
    expect(() =>
      ScopeJsonSchema.parse({ kind: "server.id", ids: [] })
    ).toThrow();
  });

  it("rejects non-uuid ids", () => {
    expect(() =>
      ScopeJsonSchema.parse({ kind: "server.id", ids: ["not-a-uuid"] })
    ).toThrow();
  });
});
