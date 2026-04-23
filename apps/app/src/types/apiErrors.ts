/**
 * API Error Types
 * Defines specific error types for better error handling
 */

interface RabbitMQPermissionError {
  error: "insufficient_permissions";
  message: string;
  code: "RABBITMQ_INSUFFICIENT_PERMISSIONS";
  requiredPermission: string;
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
