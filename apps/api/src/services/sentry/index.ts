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

export function initSentry() {
  // Only initialize Sentry if enabled and DSN is provided
  if (!sentryConfig.enabled) {
    logger.info("Sentry is disabled - skipping initialization");
    return;
  }

  if (!sentryConfig.dsn) {
    logger.warn("Sentry DSN not provided - monitoring disabled");
    return;
  }

  // Validate DSN format - must be a valid URL and not just "https://"
  const dsn = sentryConfig.dsn.trim();
  if (
    dsn === "" ||
    dsn === "https://" ||
    !dsn.startsWith("https://") ||
    dsn.length < 20
  ) {
    logger.warn("Invalid Sentry DSN format - monitoring disabled");
    return;
  }

  const Sentry = getSentry();
  if (!Sentry) {
    logger.warn("Sentry SDK not available - monitoring disabled");
    return;
  }

  let profilingIntegration: ReturnType<
    typeof import("@sentry/profiling-node").nodeProfilingIntegration
  > | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { nodeProfilingIntegration } = require("@sentry/profiling-node");
    profilingIntegration = nodeProfilingIntegration();
  } catch {
    logger.info(
      "Sentry profiling not available - skipping profiling integration"
    );
  }

  const integrations = [
    // HTTP integration for API monitoring
    Sentry.httpIntegration(),

    // Prisma integration for database monitoring
    Sentry.prismaIntegration(),

    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),

    // Pino integration for structured logging
    Sentry.pinoIntegration(),
  ];

  if (profilingIntegration) {
    integrations.unshift(profilingIntegration);
  }

  Sentry.init({
    dsn: dsn,
    environment: sentryConfig.environment,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Enable metrics to be sent to Sentry
    enableMetrics: true,

    // Performance Monitoring
    tracesSampleRate: sentryConfig.tracesSampleRate,

    // Profiling
    profilesSampleRate: sentryConfig.profilesSampleRate,

    integrations,

    // Configure what gets sent to Sentry
    beforeSend(event) {
      // Filter out sensitive information
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Don't send health check errors
      if (event.exception?.values?.[0]?.value?.includes("health")) {
        return null;
      }

      return event;
    },

    // Filter logs before sending to Sentry
    beforeSendLog(log) {
      // Skip health check logs to reduce noise
      if (
        log.message &&
        typeof log.message === "string" &&
        log.message.toLowerCase().includes("health")
      ) {
        return null;
      }

      return log;
    },

    // Set release information
    release: sentryConfig.release,

    // Configure tags
    initialScope: {
      tags: {
        component: "backend",
        service: "qarote-api",
      },
    },
  });
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
 * Track sign up errors as metrics
 * Only tracks in production environment
 */
export function trackSignUpError(
  errorType: SignUpErrorType,
  attributes: MetricAttributes
) {
  trackMetricCount("signup.error", 1, {
    tags: {
      error_type: errorType,
      ...attributes,
    },
  });
}

/**
 * Track payment errors as metrics
 * Only tracks in production environment
 */
export function trackPaymentError(
  errorType: PaymentErrorType,
  attributes: MetricAttributes
) {
  trackMetricCount("payment.error", 1, {
    tags: {
      error_type: errorType,
      ...attributes,
    },
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
