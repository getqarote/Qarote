import { PrismaPg } from "@prisma/adapter-pg";
import type {} from "@prisma/client"; // Generated Prisma client imports @prisma/client/runtime internally

import { config } from "@/config";

import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: config.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export { prisma };
