import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { logger } from "./logger";
import { getDirname } from "./utils";

/**
 * Lightweight migration runner for binary/standalone deployments.
 *
 * Reads SQL files from a `migrations/` directory (shipped alongside the binary)
 * and applies them in order, tracking state in the same `_prisma_migrations`
 * table that `prisma migrate deploy` uses.  This means a database bootstrapped
 * by the binary is fully compatible with future Prisma CLI migrations.
 *
 * Uses `pg` directly because Prisma's `$executeRawUnsafe` only handles
 * single-statement SQL, while migration files contain multiple statements.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  // Locate the migrations/ directory.
  // Resolution order mirrors the public/ directory lookup in server.ts:
  //   1. Next to the script (node dist/server.js → dist/migrations/)
  //   2. Next to the binary (compiled Bun binary → <binary-dir>/migrations/)
  //   3. Current working directory (./migrations/)
  const candidates = [
    path.resolve(getDirname(import.meta.url), "migrations"),
    path.resolve(path.dirname(process.execPath), "migrations"),
    path.resolve(process.cwd(), "migrations"),
  ];
  const migrationsDir = candidates.find(
    (dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory()
  );

  if (!migrationsDir) {
    logger.debug("No migrations/ directory found — skipping auto-migration");
    return;
  }

  // Import pg (already a project dependency via @prisma/adapter-pg)
  const pg = await import("pg");
  const Pool = pg.default?.Pool || pg.Pool;
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Acquire an advisory lock to prevent concurrent migration runs
    const lockClient = await pool.connect();
    try {
      await lockClient.query(
        "SELECT pg_advisory_lock(hashtext('qarote_migrations'))"
      );

      // Ensure the Prisma migration-tracking table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          "id"                  VARCHAR(36)  NOT NULL PRIMARY KEY,
          "checksum"            VARCHAR(64)  NOT NULL,
          "finished_at"         TIMESTAMPTZ,
          "migration_name"      VARCHAR(255) NOT NULL,
          "logs"                TEXT,
          "rolled_back_at"      TIMESTAMPTZ,
          "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
          "applied_steps_count" INTEGER      NOT NULL DEFAULT 0
        );
      `);

      // Load already-applied migrations
      const { rows: applied } = await pool.query<{ migration_name: string }>(
        `SELECT "migration_name" FROM "_prisma_migrations"
         WHERE "rolled_back_at" IS NULL
         ORDER BY "migration_name"`
      );
      const appliedSet = new Set(applied.map((r) => r.migration_name));

      // Discover migration directories (sorted lexicographically = chronological)
      const entries = fs
        .readdirSync(migrationsDir)
        .filter((e) => {
          const full = path.join(migrationsDir, e);
          return fs.statSync(full).isDirectory();
        })
        .sort();

      let appliedCount = 0;

      for (const entry of entries) {
        if (appliedSet.has(entry)) continue;

        const sqlPath = path.join(migrationsDir, entry, "migration.sql");
        if (!fs.existsSync(sqlPath)) continue;

        const sql = fs.readFileSync(sqlPath, "utf-8");
        const checksum = createHash("sha256").update(sql).digest("hex");

        logger.info(`Applying migration: ${entry}`);

        // Some DDL cannot run inside a transaction (e.g. CREATE INDEX CONCURRENTLY,
        // ALTER TYPE ... ADD VALUE). Detect these and skip BEGIN/COMMIT for them.
        const nonTransactional =
          /CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY|ALTER\s+TYPE\s+\S+\s+ADD\s+VALUE|VACUUM|CLUSTER|REINDEX/i.test(
            sql
          );

        const client = await pool.connect();
        try {
          if (nonTransactional) {
            await client.query(sql);
            await client.query(
              `INSERT INTO "_prisma_migrations"
                 ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
               VALUES ($1, $2, $3, now(), 1)`,
              [randomUUID(), checksum, entry]
            );
          } else {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query(
              `INSERT INTO "_prisma_migrations"
                 ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
               VALUES ($1, $2, $3, now(), 1)`,
              [randomUUID(), checksum, entry]
            );
            await client.query("COMMIT");
          }
          appliedCount++;
        } catch (err) {
          if (!nonTransactional) {
            await client.query("ROLLBACK").catch(() => {});
          }
          throw new Error(
            `Migration ${entry} failed: ${err instanceof Error ? err.message : String(err)}`,
            { cause: err }
          );
        } finally {
          client.release();
        }
      }

      if (appliedCount > 0) {
        logger.info(`Applied ${appliedCount} migration(s) successfully`);
      } else {
        logger.debug("Database schema is up to date");
      }
    } finally {
      await lockClient
        .query("SELECT pg_advisory_unlock(hashtext('qarote_migrations'))")
        .catch(() => {});
      lockClient.release();
    }
  } finally {
    await pool.end();
  }
}
