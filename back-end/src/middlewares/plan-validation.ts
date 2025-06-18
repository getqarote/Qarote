import { Context, Next } from "hono";
import prisma from "../core/prisma";
import {
  PlanValidationError,
  PlanLimitExceededError,
} from "../services/plan-validation.service";

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
  // For now, return 0. In a real implementation, you would track message sending
  // This could be implemented with a separate table or Redis counter
  return 0;
}
