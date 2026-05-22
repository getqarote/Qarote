/**
 * Scope canonicalization (RBAC Phase 3 PR-2).
 *
 * Custom roles attach a `scopeJson` to each `RolePermission` row. The
 * DB-side `scopeFingerprint` GENERATED column hashes
 * `coalesce(scopeCanonical, '')` — so two semantically-equivalent
 * scopes must produce byte-identical `scopeCanonical` strings, or the
 * `(roleId, permissionKey, scopeFingerprint)` partial unique index
 * won't catch "duplicate scope, different insertion order".
 *
 * Rules:
 *   - Object keys sorted lexicographically (deterministic JSON.stringify).
 *   - Array elements sorted *only* for set-like fields whose semantics
 *     don't depend on order — `ids` and `values` in v1. Other arrays
 *     would not be sorted; we don't have any in v1.
 *   - `null` scope → `null` canonical (caller passes through; the
 *     DB-side `coalesce(scopeCanonical, '')` handles it).
 *
 * Parity contract: the test at `__tests__/scope-canonical.test.ts`
 * runs canonicalizeScope through ~12 fixture shapes and asserts the
 * SHA-256 hex matches what Postgres `encode(digest(coalesce(...),
 * 'sha256'), 'hex')` would produce. If a future scope kind is added,
 * the test MUST be extended in the same PR.
 */

import { createHash } from "node:crypto";

import { z } from "zod";

/**
 * Discriminated union of accepted scope shapes. Mirrors
 * `auth/scope-evaluator.ts` so the writer and reader stay in lockstep.
 * Zod validation lives here (write-time) — the evaluator trusts the
 * stored shape and fail-closes on anything it doesn't recognise.
 */
const ServerIdScopeSchema = z
  .object({
    kind: z.literal("server.id"),
    ids: z.array(z.string().uuid()).min(1).max(100),
  })
  .strict();

const ServerEnvironmentScopeSchema = z
  .object({
    kind: z.literal("server.environment"),
    values: z.array(z.string().min(1).max(64)).min(1).max(16),
  })
  .strict();

export const ScopeJsonSchema = z.discriminatedUnion("kind", [
  ServerIdScopeSchema,
  ServerEnvironmentScopeSchema,
]);

export type ScopeJson = z.infer<typeof ScopeJsonSchema>;

/**
 * Produce the canonical text representation of a scope. Two
 * semantically-equivalent scopes (same kind, same set of ids/values)
 * always produce identical strings — that is the property the
 * DB-side fingerprint relies on for `(roleId, permissionKey,
 * scopeFingerprint)` uniqueness.
 *
 * `null` scope returns `null`; the caller writes that directly to
 * `RolePermission.scopeCanonical` and the generated column hashes
 * `coalesce(scopeCanonical, '')` → `sha256('')`.
 */
export function canonicalizeScope(scope: ScopeJson | null): string | null {
  if (scope === null) return null;
  switch (scope.kind) {
    case "server.id": {
      // Set-like — sort + dedupe for deterministic output.
      const ids = Array.from(new Set(scope.ids)).sort();
      return JSON.stringify({ kind: scope.kind, ids });
    }
    case "server.environment": {
      const values = Array.from(new Set(scope.values)).sort();
      return JSON.stringify({ kind: scope.kind, values });
    }
    default: {
      const _exhaustive: never = scope;
      throw new Error(
        `canonicalizeScope: unknown scope kind ${JSON.stringify(_exhaustive)}`
      );
    }
  }
}

/**
 * App-side equivalent of the Postgres GENERATED column expression
 * `encode(digest(coalesce(scopeCanonical, ''), 'sha256'), 'hex')`.
 * Used by tests (parity), and by anti-escalation when comparing
 * scopes by fingerprint without hitting the DB.
 */
export function scopeFingerprint(scope: ScopeJson | null): string {
  const canonical = canonicalizeScope(scope) ?? "";
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
