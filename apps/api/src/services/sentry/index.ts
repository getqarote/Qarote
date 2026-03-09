import { sentryConfig } from "@/config";

import { logger } from "../../core/logger";
import type {
  MessageProcessingErrorContext,
  MetricAttributes,
  MetricOptions,
  PaymentErrorType,
  RabbitMQErrorContext,
  SentryContextData,
  SentryUser,
  SignUpErrorType,
} from "./interfaces";

// Lazy-loaded Sentry SDK.
// @sentry/node is marked --external in the binary build (native profiling deps
// can't be bundled), so it won't exist in single-binary mode.  We resolve once
// on first use and silently no-op when the module is missing.
let _sentry: typeof import("@sentry/node") | null = null;
let _sentryResolved = false;

function getSentry(): typeof import("@sentry/node") | null {
  if (_sentryResolved) return _sentry;
  _sentryResolved = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _sentry = require("@sentry/node");
  } catch {
    _sentry = null;
  }
  return _sentry;
}

/**
 * Check if metrics should be tracked (only in production)
 */
function shouldTrackMetrics(): boolean {
  return sentryConfig.environment === "production" && sentryConfig.enabled;
}

/**
 * Track a counter metric
 * Only tracks in production environment
 */
export function trackMetricCount(
  name: string,
  value: number,
  options?: Omit<MetricOptions, "tags"> & { tags?: MetricAttributes }
) {
  if (!shouldTrackMetrics()) {
    return;
  }

  const Sentry = getSentry();
  if (!Sentry) return;

  try {
    Sentry.metrics.count(name, value, {
      tags: options?.tags || {},
      unit: options?.unit,
    } as MetricOptions);
  } catch (error) {
    // Never let metrics tracking throw
    logger.warn({ error, metricName: name }, "Failed to track count metric");
  }
}

/**
 * Track a distribution metric
 * Only tracks in production environment
 */
export function trackMetricDistribution(
  name: string,
  value: number,
  options?: Omit<MetricOptions, "tags"> & { tags?: MetricAttributes }
) {
  if (!shouldTrackMetrics()) {
    return;
  }

  const Sentry = getSentry();
  if (!Sentry) return;

  try {
    Sentry.metrics.distribution(name, value, {
      tags: options?.tags || {},
      unit: options?.unit,
    } as MetricOptions);
  } catch (error) {
    // Never let metrics tracking throw
    logger.warn(
      { error, metricName: name },
      "Failed to track distribution metric"
    );
  }
}

export function setSentryUser(user: SentryUser) {
  const Sentry = getSentry();
  if (!Sentry) return;

  Sentry.setUser({
    id: user.id,
    workspace_id: user.workspaceId || undefined,
    email: user.email,
  });
}

export function setSentryContext(context: string, data: SentryContextData) {
  const Sentry = getSentry();
  if (!Sentry) return;

  Sentry.setContext(context, data);
}

export function captureRabbitMQError(
  error: Error,
  context: RabbitMQErrorContext
) {
  const Sentry = getSentry();
  if (!Sentry) return;

  Sentry.withScope((scope) => {
    scope.setTag("component", "rabbitmq");
    scope.setContext("rabbitmq", context);
    Sentry.captureException(error);
  });
}

export function captureMessageProcessingError(
  error: Error,
  context: MessageProcessingErrorContext
) {
  const Sentry = getSentry();
  if (!Sentry) return;

  Sentry.withScope((scope) => {
    scope.setTag("component", "message-processing");
    scope.setContext("message", context);
    Sentry.captureException(error);
  });
}

/**
 * Track sign up errors as metrics and capture as Sentry exception
 * Only tracks in production environment
 */
export function trackSignUpError(
  errorType: SignUpErrorType,
  attributes: MetricAttributes,
  error?: unknown
) {
  trackMetricCount("signup.error", 1, {
    tags: {
      error_type: errorType,
      ...attributes,
    },
  });

  const Sentry = getSentry();
  if (!Sentry) return;

  const exception =
    error instanceof Error ? error : new Error(`Signup failed: ${errorType}`);

  Sentry.withScope((scope) => {
    scope.setTag("component", "signup");
    scope.setTag("error_type", errorType);
    scope.setLevel("error");
    scope.setContext("signup", attributes);
    Sentry.captureException(exception);
  });
}

/**
 * Track payment errors as metrics and capture as Sentry exception
 * Only tracks in production environment
 */
export function trackPaymentError(
  errorType: PaymentErrorType,
  attributes: MetricAttributes,
  error?: unknown
) {
  trackMetricCount("payment.error", 1, {
    tags: {
      error_type: errorType,
      ...attributes,
    },
  });

  const Sentry = getSentry();
  if (!Sentry) return;

  const exception =
    error instanceof Error ? error : new Error(`Payment failed: ${errorType}`);

  Sentry.withScope((scope) => {
    scope.setTag("component", "payment");
    scope.setTag("error_type", errorType);
    scope.setLevel("error");
    scope.setContext("payment", attributes);
    Sentry.captureException(exception);
  });
}

// Re-export Sentry for callers that need direct access (e.g. `Sentry.captureException`).
// Returns the real SDK when available, or a safe no-op proxy in binary mode.
const SentryProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      const sentry = getSentry();
      if (!sentry) return () => {};
      return (sentry as Record<string | symbol, unknown>)[prop];
    },
  }
) as typeof import("@sentry/node");

export { SentryProxy as Sentry };
