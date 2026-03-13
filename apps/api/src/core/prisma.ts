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

export { prisma };
