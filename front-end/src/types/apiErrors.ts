/**
 * API Error Types
 * Defines specific error types for better error handling
 */

export interface RabbitMQPermissionError {
  error: "insufficient_permissions";
  message: string;
  code: "RABBITMQ_INSUFFICIENT_PERMISSIONS";
  requiredPermission: string;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
}

export class ApiErrorWithCode extends Error {
  public readonly code?: string;
  public readonly originalMessage?: string;

  constructor(message: string, code?: string, originalMessage?: string) {
    super(message);
    this.name = "ApiErrorWithCode";
    this.code = code;
    this.originalMessage = originalMessage;
  }
}

export class RabbitMQAuthorizationError extends Error {
  public readonly code: string;
  public readonly requiredPermission: string;
  public readonly isRabbitMQAuthError = true;

  constructor(permissionError: RabbitMQPermissionError) {
    super(permissionError.message);
    this.name = "RabbitMQAuthorizationError";
    this.code = permissionError.code;
    this.requiredPermission = permissionError.requiredPermission;
  }
}

export function isRabbitMQAuthError(
  error: unknown
): error is RabbitMQAuthorizationError {
  return (
    error instanceof RabbitMQAuthorizationError ||
    (error instanceof Error && "isRabbitMQAuthError" in error)
  );
}

export function parseApiError(errorResponse: unknown): Error {
  if (typeof errorResponse === "object" && errorResponse !== null) {
    const errorData = errorResponse as Record<string, unknown>;

    // Check if this is a RabbitMQ permission error
    if (
      errorData.error === "insufficient_permissions" &&
      errorData.code === "RABBITMQ_INSUFFICIENT_PERMISSIONS" &&
      typeof errorData.message === "string" &&
      typeof errorData.requiredPermission === "string"
    ) {
      return new RabbitMQAuthorizationError({
        error: "insufficient_permissions",
        message: errorData.message,
        code: "RABBITMQ_INSUFFICIENT_PERMISSIONS",
        requiredPermission: errorData.requiredPermission,
      });
    }

    // Handle general API errors with error and code
    if (typeof errorData.error === "string") {
      // Prefer message if available, otherwise use error
      const message =
        typeof errorData.message === "string"
          ? errorData.message
          : errorData.error;

      return new ApiErrorWithCode(
        message,
        typeof errorData.code === "string" ? errorData.code : undefined,
        typeof errorData.message === "string" ? errorData.message : undefined
      );
    }

    // Handle message-only errors
    if (typeof errorData.message === "string") {
      return new Error(errorData.message);
    }
  }

  // Return generic error for other cases
  if (errorResponse instanceof Error) {
    return errorResponse;
  }

  return new Error(
    typeof errorResponse === "string" ? errorResponse : "Unknown error"
  );
}
