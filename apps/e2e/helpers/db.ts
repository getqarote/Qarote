import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

import type { PrismaClient } from "../../api/src/generated/prisma/client.js";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env.test") });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5433/qarote_e2e";

let prismaInstance: PrismaClient | null = null;

/**
 * Get a shared Prisma client instance for test helpers.
 * Lazily initialized to avoid import issues.
 */
async function getPrisma(): Promise<PrismaClient> {
  if (!prismaInstance) {
    const { PrismaClient } = await import(
      "../../api/src/generated/prisma/client.js"
    );
    const adapter = new PrismaPg({ connectionString: DATABASE_URL });
    prismaInstance = new PrismaClient({ adapter });
  }
  return prismaInstance;
}

export class DbHelper {
  private createdIds: { table: string; id: string }[] = [];

  async getClient() {
    return getPrisma();
  }

  /** Track created records for cleanup */
  track(table: string, id: string) {
    this.createdIds.push({ table, id });
  }

  /**
   * Clean up records created during this test (reverse order for FK constraints).
   * SAFETY: table names are developer-controlled via track() — never from user input.
   * The id values are parameterized ($1) to prevent SQL injection.
   */
  async cleanup() {
    const prisma = await getPrisma();
    const idsToDelete = [...this.createdIds].reverse();
    for (const { table, id } of idsToDelete) {
      try {
        await prisma.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE id = $1`,
          id
        );
      } catch (err: any) {
        const msg = err?.message ?? "";
        if (msg.includes("does not exist")) continue;
        throw err;
      }
    }
    this.createdIds = [];
  }

  /** Delete a SystemSetting by key (uses key as PK, not id) */
  async clearSystemSetting(key: string) {
    const prisma = await getPrisma();
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "SystemSetting" WHERE key = $1`,
        key
      );
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("does not exist")) return;
      throw err;
    }
  }

  async getUserByEmail(email: string) {
    const prisma = await getPrisma();
    return prisma.user.findUnique({ where: { email } });
  }

  async getWorkspaceByName(name: string) {
    const prisma = await getPrisma();
    return prisma.workspace.findFirst({ where: { name } });
  }
}
