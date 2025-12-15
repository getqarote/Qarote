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

  let errorMessage = defaultMessage;
  let rabbitMQReason: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    // Extract RabbitMQ API reason from error cause
    if (error.cause) {
      rabbitMQReason = String(error.cause);
      // Include RabbitMQ reason in the message for better visibility
      errorMessage = `${error.message}${rabbitMQReason ? `: ${rabbitMQReason}` : ""}`;
    }
  }

  return c.json(
    {
      error: defaultMessage,
      message: errorMessage,
      ...(rabbitMQReason && { rabbitMQReason }),
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

/**
 * Helper function to safely extract workspaceId from context
 * The middleware ensures it exists, but TypeScript doesn't know that
 * when middleware is applied at parent level with pattern matching
 */
export function getWorkspaceId(c: Context): string {
  const workspaceId = c.req.param("workspaceId");
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }
  return workspaceId;
}
