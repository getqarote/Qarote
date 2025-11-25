import { PrismaClient } from "../generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { databaseConfig } from "@/config";
import { Pool } from "pg";

// Prisma 7 requires a driver adapter
const pool = new Pool({
  connectionString: databaseConfig.url,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
