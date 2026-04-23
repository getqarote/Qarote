import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { config } from "@/config";

import { PrismaClient } from "@/generated/prisma/client";

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_SIZE || "10", 10),
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

/**
 * Configure PostgreSQL server timeouts to prevent zombie connections.
 * Uses ALTER SYSTEM so settings persist across PostgreSQL restarts.
 * Safe to call multiple times — idempotent.
 */
async function configurePostgresTimeouts(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("ALTER SYSTEM SET idle_session_timeout = '30min'");
    await client.query(
      "ALTER SYSTEM SET idle_in_transaction_session_timeout = '5min'"
    );
    await client.query("SELECT pg_reload_conf()");
  } finally {
    client.release();
  }
}

export { configurePostgresTimeouts, prisma };
