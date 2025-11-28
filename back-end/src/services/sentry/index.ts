import Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

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
  StreamingErrorContext,
} from "./interfaces";

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

/**
 * Track a gauge metric
 * Only tracks in production environment
 */
export function trackMetricGauge(
  name: string,
  value: number,
  options?: Omit<MetricOptions, "tags"> & { tags?: MetricAttributes }
) {
  if (!shouldTrackMetrics()) {
    return;
  }

  try {
    Sentry.metrics.gauge(name, value, {
      tags: options?.tags || {},
      unit: options?.unit,
    } as MetricOptions);
  } catch (error) {
    // Never let metrics tracking throw
    logger.warn({ error, metricName: name }, "Failed to track gauge metric");
  }
}

export function initSentry() {
  // Only initialize Sentry in production or when explicitly enabled
  if (!sentryConfig.enabled && sentryConfig.environment !== "production") {
    return;
  }

  if (!sentryConfig.dsn) {
    logger.warn("Sentry DSN not provided - monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Enable metrics to be sent to Sentry
    enableMetrics: true,

    // Performance Monitoring
    tracesSampleRate: sentryConfig.tracesSampleRate,

    // Profiling
    profilesSampleRate: sentryConfig.profilesSampleRate,

    integrations: [
      nodeProfilingIntegration(),

      // HTTP integration for API monitoring
      Sentry.httpIntegration(),

      // Prisma integration for database monitoring
      Sentry.prismaIntegration(),

      // send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),

      // Pino integration for structured logging
      Sentry.pinoIntegration(),
    ],

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
        service: "rabbithq-api",
      },
    },
  });
}

export function setSentryUser(user: SentryUser) {
  Sentry.setUser({
    id: user.id,
    workspace_id: user.workspaceId || undefined,
    email: user.email,
  });
}

export function setSentryContext(context: string, data: SentryContextData) {
  Sentry.setContext(context, data);
}

export function captureRabbitMQError(
  error: Error,
  context: RabbitMQErrorContext
) {
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
  Sentry.withScope((scope) => {
    scope.setTag("component", "message-processing");
    scope.setContext("message", context);
    Sentry.captureException(error);
  });
}

export function captureStreamingError(
  error: Error,
  context: StreamingErrorContext
) {
  Sentry.withScope((scope) => {
    scope.setTag("component", "streaming");
    scope.setContext("stream", context);
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

export { MetricOptions, Sentry };
