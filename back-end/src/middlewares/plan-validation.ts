import { Context, Next } from "hono";
import {
  PlanValidationError,
  PlanLimitExceededError,
} from "@/services/plan/plan.service";

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
