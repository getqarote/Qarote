import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(import.meta.dirname, "../.env.test") });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5433/qarote_e2e";

let prismaInstance: any = null;

/**
 * Get a shared Prisma client instance for test helpers.
 * Lazily initialized to avoid import issues.
 */
async function getPrisma() {
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

  /** Clean up records created during this test (reverse order for FK constraints) */
  async cleanup() {
    const prisma = await getPrisma();
    for (const { table, id } of this.createdIds.reverse()) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE id = $1`,
        id
      ).catch(() => {});
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
