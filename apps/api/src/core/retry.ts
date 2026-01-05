import { setTimeout as setTimeoutPromise } from "node:timers/promises";

import { logger } from "./logger";

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelayMs: 1_000, // 1 second
  timeoutMs: 10_000, // 10 seconds
};

/**
 * Check if an error is a timeout error
 */
function isTimeoutError(error: unknown): boolean {
  if (!error) return false;

  // Check for AbortError (from AbortController)
  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    if (error.message.includes("timeout")) return true;
    if (error.message.includes("aborted")) return true;
  }

  // Check for timeout in error object
  if (
    typeof error === "object" &&
    error !== null &&
    ("timeout" in error || "code" in error)
  ) {
    const errorObj = error as { timeout?: boolean; code?: string };
    if (errorObj.timeout === true) return true;
    if (errorObj.code === "ETIMEDOUT" || errorObj.code === "ECONNRESET")
      return true;
  }

  return false;
}

/**
 * Check if an error is a 5xx HTTP error or 429 (rate limiting)
 * 429 is included as it's a transient error that should be retried
 */
function is5xxError(error: unknown): boolean {
  if (!error) return false;

  // Check for status code in error object
  if (typeof error === "object" && error !== null) {
    const errorObj = error as {
      status?: number;
      statusCode?: number;
      code?: number;
    };

    const statusCode = errorObj.status ?? errorObj.statusCode ?? errorObj.code;

    if (typeof statusCode === "number") {
      // Retry on 5xx errors or 429 (rate limiting)
      return statusCode >= 500 || statusCode === 429;
    }
  }

  return false;
}

/**
 * Check if an error is a Stripe 5xx error
 */
function isStripe5xxError(error: unknown): boolean {
  if (!error) return false;

  // Stripe errors have a statusCode property
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const stripeError = error as { statusCode?: number };
    if (
      typeof stripeError.statusCode === "number" &&
      stripeError.statusCode >= 500
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an error is a Notion 5xx error
 */
function isNotion5xxError(error: unknown): boolean {
  if (!error) return false;

  // Notion errors have a code property that can be an enum value or string
  if (typeof error === "object" && error !== null && "code" in error) {
    const notionError = error as { code?: string | number | unknown };
    const code = notionError.code;

    // Check for Notion 5xx error codes (enum values or strings)
    if (typeof code === "string") {
      // Check for string representations of Notion error codes
      return (
        code === "internal_server_error" ||
        code === "service_unavailable" ||
        code === "RequestTimeout" ||
        code.includes("InternalServerError") ||
        code.includes("ServiceUnavailable")
      );
    }

    // Check if code is an object (enum value) - compare by string representation
    if (typeof code === "object" && code !== null) {
      const codeStr = String(code);
      return (
        codeStr.includes("InternalServerError") ||
        codeStr.includes("ServiceUnavailable") ||
        codeStr.includes("RequestTimeout")
      );
    }

    // Check for numeric status codes
    if (typeof code === "number" && code >= 500) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an error should be retried
 * Retries on 5xx errors and timeout errors, but not on 4xx errors
 */
export function shouldRetry(
  error: unknown,
  errorType?: "resend" | "stripe" | "notion" | "generic"
): boolean {
  // Always retry on timeout errors
  if (isTimeoutError(error)) {
    return true;
  }

  // Check based on error type
  switch (errorType) {
    case "stripe":
      return isStripe5xxError(error);
    case "notion":
      return isNotion5xxError(error);
    case "resend":
    case "generic":
    default:
      return is5xxError(error);
  }
}

/**
 * Create a timeout promise that rejects after the specified time
 */
function createTimeout(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Retry a function with exponential backoff
 * Only retries on 5xx errors and timeout errors, not on 4xx errors
 *
 * @param fn - The function to retry
 * @param config - Retry configuration
 * @param errorType - Type of error to handle (for proper error detection)
 * @returns The result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  errorType: "resend" | "stripe" | "notion" | "generic" = "generic"
): Promise<T> {
  const { maxRetries, retryDelayMs, timeoutMs } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Create timeout promise
      const timeoutPromise = createTimeout(timeoutMs);

      // Race between the function and timeout
      const result = await Promise.race([fn(), timeoutPromise]);

      // If we get here, the function succeeded
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error, errorType)) {
        // Don't retry on 4xx errors or other non-retryable errors
        throw error;
      }

      // Check if we've exhausted retries
      if (attempt >= maxRetries) {
        logger.warn(
          {
            attempt,
            maxRetries,
            errorType,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Max retries exceeded, throwing error"
        );
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = retryDelayMs * Math.pow(2, attempt);

      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries,
          delay,
          errorType,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "Retrying after error with exponential backoff"
      );

      // Wait before retrying
      await setTimeoutPromise(delay);

      attempt++;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry a function with exponential backoff and timeout handling
 * Wraps the function with AbortController for timeout control
 *
 * @param fn - The function to retry (should accept an AbortSignal)
 * @param config - Retry configuration
 * @param errorType - Type of error to handle (for proper error detection)
 * @returns The result of the function
 */
export async function retryWithBackoffAndTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  config: RetryConfig = {},
  errorType: "resend" | "stripe" | "notion" | "generic" = "generic"
): Promise<T> {
  const { maxRetries, retryDelayMs, timeoutMs } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      // Check if it's a timeout (abort error)
      if (controller.signal.aborted) {
        // Treat abort as timeout error
        const timeoutError = new Error("Operation timed out");
        timeoutError.name = "AbortError";
        lastError = timeoutError;
      }

      // Check if we should retry
      if (!shouldRetry(lastError, errorType)) {
        // Don't retry on 4xx errors or other non-retryable errors
        throw lastError;
      }

      // Check if we've exhausted retries
      if (attempt >= maxRetries) {
        logger.warn(
          {
            attempt,
            maxRetries,
            errorType,
            error:
              lastError instanceof Error ? lastError.message : "Unknown error",
          },
          "Max retries exceeded, throwing error"
        );
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = retryDelayMs * Math.pow(2, attempt);

      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries,
          delay,
          errorType,
          error:
            lastError instanceof Error ? lastError.message : "Unknown error",
        },
        "Retrying after error with exponential backoff"
      );

      // Wait before retrying
      await setTimeoutPromise(delay);

      attempt++;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
