import { Context, Next } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import {
  PlanValidationError,
  PlanLimitExceededError,
} from "@/services/plan-validation.service";

interface Variables {
  user: {
    id: string;
    workspaceId: string;
  };
}

export function planValidationMiddleware() {
  return async (c: Context<{ Variables: Variables }>, next: Next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof PlanValidationError) {
        return c.json(
          {
            error: "Plan restriction",
            message: error.message,
            code: "PLAN_RESTRICTION",
            details: {
              feature: error.feature,
              currentPlan: error.currentPlan,
              requiredPlan: error.requiredPlan,
              currentCount: error.currentCount,
              limit: error.limit,
            },
          },
          402 // Payment Required
        );
      }

      if (error instanceof PlanLimitExceededError) {
        return c.json(
          {
            error: "Plan limit exceeded",
            message: error.message,
            code: "PLAN_LIMIT_EXCEEDED",
            details: {
              feature: error.feature,
              currentCount: error.currentCount,
              limit: error.limit,
              currentPlan: error.currentPlan,
            },
          },
          402 // Payment Required
        );
      }

      // Re-throw other errors
      throw error;
    }
  };
}

export async function getWorkspacePlan(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true },
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  return workspace.plan;
}

export async function getWorkspaceResourceCounts(workspaceId: string) {
  const [serverCount, queueCount, userCount] = await Promise.all([
    prisma.rabbitMQServer.count({
      where: { workspaceId },
    }),
    prisma.queue.count({
      where: {
        server: {
          workspaceId,
        },
      },
    }),
    prisma.user.count({
      where: { workspaceId },
    }),
  ]);

  return {
    servers: serverCount,
    queues: queueCount,
    users: userCount,
  };
}

export async function getMonthlyMessageCount(
  workspaceId: string
): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed

  try {
    const messageCount = await prisma.monthlyMessageCount.findUnique({
      where: {
        monthly_message_count_unique: {
          workspaceId,
          year,
          month,
        },
      },
    });

    return messageCount?.count || 0;
  } catch (error) {
    logger.error({ error }, "Error fetching monthly message count");
    return 0;
  }
}

export async function incrementMonthlyMessageCount(
  workspaceId: string
): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed

  try {
    // Use upsert to either create a new record or increment existing one
    const messageCount = await prisma.monthlyMessageCount.upsert({
      where: {
        monthly_message_count_unique: {
          workspaceId,
          year,
          month,
        },
      },
      update: {
        count: {
          increment: 1,
        },
      },
      create: {
        workspaceId,
        year,
        month,
        count: 1,
      },
    });

    return messageCount.count;
  } catch (error) {
    logger.error({ error }, "Error incrementing monthly message count");
    throw new Error("Failed to increment message count");
  }
}
