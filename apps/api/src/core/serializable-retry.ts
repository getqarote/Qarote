/**
 * SERIALIZABLE-tx retry wrapper (RBAC Phase 3 PR-2).
 *
 * Postgres raises SQLSTATE 40001 (`serialization_failure`) when an SSI
 * transaction detects write-skew between concurrent committers. Prisma
 * does **not** auto-retry — the failure surfaces to the caller as an
 * exception. RBAC role mutations (`role.setPermissions`, `role.create`,
 * `assignRole`) rely on SERIALIZABLE + FOR UPDATE to enforce the
 * "creator currently holds (key, scope)" invariant; a serialization
 * failure there means a concurrent permission write moved the
 * authority surface, so retrying with a fresh re-resolution is the
 * correct behaviour.
 *
 * Bounded: 3 attempts total, 50ms backoff between (no exponential —
 * the contention window is short and we don't want to amplify it).
 * Anything other than 40001 propagates immediately.
 */

import { Prisma } from "@/generated/prisma/client";

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 50;

/** Postgres serialization_failure SQLSTATE — re-tryable. */
const SERIALIZATION_FAILURE = "40001";

function isSerializationFailure(err: unknown): boolean {
  // Prisma raises `PrismaClientKnownRequestError` with `meta.code`
  // populated for known Postgres SQLSTATEs (code "P2034" for
  // write-conflict on transactions). Older drivers / raw queries
  // surface SQLSTATE directly on `err.code`. Cover both.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2034") return true; // serialization failure
    const meta = err.meta as { code?: string } | undefined;
    if (meta?.code === SERIALIZATION_FAILURE) return true;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === SERIALIZATION_FAILURE
  ) {
    return true;
  }
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` up to 3 times, retrying only on SQLSTATE 40001
 * (`serialization_failure`). The caller is responsible for opening
 * the SERIALIZABLE transaction inside `fn` — this wrapper only
 * handles the retry shell.
 *
 * @example
 *   await withSerializableRetry(() =>
 *     prisma.$transaction(
 *       async (tx) => {
 *         // ... lock, re-resolve, mutate
 *       },
 *       { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
 *     )
 *   );
 */
export async function withSerializableRetry<T>(
  fn: () => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isSerializationFailure(err) || attempt === MAX_ATTEMPTS) {
        throw err;
      }
      await sleep(BACKOFF_MS);
    }
  }
  // Unreachable — the loop either returns or throws.
  throw lastError;
}
