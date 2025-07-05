import { Context } from "hono";
import { logger } from "@/core/logger";

/**
 * Standard error response for controllers
 */
export function createErrorResponse(
  c: Context,
  error: unknown,
  statusCode: 400 | 404 | 500 = 500,
  defaultMessage = "Unknown error occurred"
) {
  logger.error({ error }, "Controller error");
  return c.json(
    {
      error: defaultMessage,
      message: error instanceof Error ? error.message : "Unknown error",
    },
    statusCode
  );
}

export function getUserDisplayName(user: {
  firstName: string;
  lastName: string;
}): string {
  return `${user.firstName} ${user.lastName}`;
}
