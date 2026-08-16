import { createHash } from "node:crypto";

import { logger } from "./logger";
import {
  type BootstrapUnit,
  TIMESCALE_BOOTSTRAP_UNITS,
} from "./ts-bootstrap.sql";

/**
 * TimescaleDB bootstrap runner — creates objects whose DDL cannot run inside a
 * transaction (continuous aggregates + their policies), so it lives OUTSIDE the
 * Prisma migration path (`core/migrate.ts` wraps each migration in BEGIN/COMMIT).
 *
 * Runs at every startup, after `runMigrations`, in every deployment mode. The SQL
 * ships inline (see `ts-bootstrap.sql.ts`) so it is present in every artifact —
 * Docker/Dokku have no `prisma migrate deploy` equivalent that would otherwise
 * create the CAGG.
 *
 * Each unit is checksummed; a unit already applied with a DIFFERENT checksum is a
 * hard ERROR (an edited shipped unit), never an auto-drop — a populated CAGG must
 * never be silently dropped by a code edit. Statements run one-per-`query()` with
 * no transaction; all are idempotent, so a re-run or a race is safe.
 */
const ADVISORY_LOCK_KEY = "qarote_ts_bootstrap";
// The CAGG needs BOTH the base `timescaledb` extension (for the continuous
// aggregate) and `timescaledb_toolkit` (counter_agg / percentile_agg) installed.
const REQUIRED_EXTENSIONS = ["timescaledb", "timescaledb_toolkit"];

function checksumOf(unit: BootstrapUnit): string {
  return createHash("sha256").update(unit.statements.join("\n")).digest("hex");
}

export async function runTimescaleBootstrap(
  databaseUrl: string
): Promise<void> {
  const pg = await import("pg");
  const Pool = pg.default?.Pool || pg.Pool;
  // Bound every session so a peer replica holding the advisory lock (or a hung
  // DDL) fails the boot fast with a clear error instead of hanging indefinitely
  // before the server starts serving. lock_timeout covers the pg_advisory_lock
  // wait; statement_timeout covers each metadata/DDL query (all fast — the CAGG is
  // created WITH NO DATA, materialization happens later via the refresh policy).
  const pool = new Pool({
    connectionString: databaseUrl,
    lock_timeout: 15_000,
    statement_timeout: 60_000,
  });

  try {
    const lockClient = await pool.connect();
    try {
      await lockClient.query("SELECT pg_advisory_lock(hashtext($1))", [
        ADVISORY_LOCK_KEY,
      ]);

      // The CAGG DDL calls Toolkit hyperfunctions (counter_agg, percentile_agg),
      // so the extension must already be CREATEd (a Prisma migration does that;
      // `core/migrate.ts` runs first and preflights that it is AVAILABLE). Guard
      // here too — a clear message beats a cryptic "function counter_agg does not
      // exist" mid-DDL.
      const { rows: extRows } = await pool.query<{ extname: string }>(
        `SELECT extname FROM pg_extension WHERE extname = ANY($1::text[])`,
        [REQUIRED_EXTENSIONS]
      );
      const installed = new Set(extRows.map((r) => r.extname));
      const missing = REQUIRED_EXTENSIONS.filter((e) => !installed.has(e));
      if (missing.length > 0) {
        throw new Error(
          `TimescaleDB bootstrap: required extension(s) not installed: ${missing.join(", ")}. ` +
            `They must be created before the continuous aggregate can be built (the schema ` +
            `migration runs CREATE EXTENSION; ensure that migration has been applied and the ` +
            `Postgres image ships TimescaleDB + Toolkit). See docs/SELF_HOSTED_DEPLOYMENT.md.`
        );
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "_qarote_ts_bootstrap" (
          "name"       TEXT        NOT NULL PRIMARY KEY,
          "checksum"   VARCHAR(64) NOT NULL,
          "status"     TEXT        NOT NULL DEFAULT 'applied',
          "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      // Defensive for any pre-release DB that ran an earlier build of this table
      // without the status column.
      await pool.query(
        `ALTER TABLE "_qarote_ts_bootstrap"
           ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'applied'`
      );

      const { rows: appliedRows } = await pool.query<{
        name: string;
        checksum: string;
        status: string;
      }>(`SELECT "name", "checksum", "status" FROM "_qarote_ts_bootstrap"`);
      const priorByName = new Map(
        appliedRows.map((r) => [
          r.name,
          { checksum: r.checksum, status: r.status },
        ])
      );

      let appliedCount = 0;

      for (const unit of TIMESCALE_BOOTSTRAP_UNITS) {
        const checksum = checksumOf(unit);
        const prior = priorByName.get(unit.name);

        // A recorded unit with a DIFFERENT checksum is always an error — whether it
        // was fully applied OR left half-applied by a partial failure. The
        // immutability guard must fire even mid-recovery, so an edit can never
        // combine with a stale IF-NOT-EXISTS object to look consistent.
        if (prior !== undefined && prior.checksum !== checksum) {
          throw new Error(
            `TimescaleDB bootstrap unit "${unit.name}" was already recorded with a ` +
              `different checksum (status: ${prior.status}). Shipped units are immutable — ` +
              `never edit one in place (a checksum change is an error, not an auto-drop, so a ` +
              `populated continuous aggregate is never silently dropped). To change it, add a ` +
              `new versioned unit that performs the change explicitly.`
          );
        }
        if (prior?.status === "applied") continue; // done, unchanged

        // Fresh unit: record the checksum in an `applying` state BEFORE running any
        // statement. If a later statement then fails, the row survives, so a
        // subsequent deploy that edits the unit trips the checksum guard above
        // instead of silently keeping the half-applied object (IF NOT EXISTS) and
        // recording the new checksum. A same-checksum re-run resumes here.
        if (prior === undefined) {
          await pool.query(
            `INSERT INTO "_qarote_ts_bootstrap" ("name", "checksum", "status")
             VALUES ($1, $2, 'applying')`,
            [unit.name, checksum]
          );
          logger.info(`Applying TimescaleDB bootstrap unit: ${unit.name}`);
        } else {
          logger.warn(
            `Resuming partially-applied TimescaleDB bootstrap unit: ${unit.name}`
          );
        }

        // No transaction — CAGG DDL forbids it. Each statement is idempotent, so a
        // resume re-runs them harmlessly.
        const client = await pool.connect();
        try {
          for (const statement of unit.statements) {
            await client.query(statement);
          }
        } catch (err) {
          throw new Error(
            `TimescaleDB bootstrap unit ${unit.name} failed: ${
              err instanceof Error ? err.message : String(err)
            }`,
            { cause: err }
          );
        } finally {
          client.release();
        }

        // All statements succeeded → mark applied.
        await pool.query(
          `UPDATE "_qarote_ts_bootstrap" SET "status" = 'applied', "applied_at" = now()
           WHERE "name" = $1`,
          [unit.name]
        );
        appliedCount++;
      }

      if (appliedCount > 0) {
        logger.info(
          `Applied ${appliedCount} TimescaleDB bootstrap unit(s) successfully`
        );
      } else {
        logger.debug("TimescaleDB bootstrap is up to date");
      }
    } finally {
      await lockClient
        .query("SELECT pg_advisory_unlock(hashtext($1))", [ADVISORY_LOCK_KEY])
        .catch(() => {});
      lockClient.release();
    }
  } finally {
    await pool.end();
  }
}
