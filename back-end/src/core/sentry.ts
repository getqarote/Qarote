import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logger } from "./logger";

export function initSentry() {
  // Only initialize Sentry in production or when explicitly enabled
  if (process.env.NODE_ENV !== "production" && !process.env.SENTRY_ENABLED) {
    return;
  }

  if (!process.env.SENTRY_DSN) {
    logger.warn("Sentry DSN not provided - monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    integrations: [
      nodeProfilingIntegration(),

      // HTTP integration for API monitoring
      Sentry.httpIntegration(),

      // Prisma integration for database monitoring
      Sentry.prismaIntegration(),
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

    // Set release information
    release:
      process.env.SENTRY_RELEASE ||
      `rabbit-scout-backend@${process.env.npm_package_version || "unknown"}`,

    // Configure tags
    initialScope: {
      tags: {
        component: "backend",
        service: "rabbit-scout-api",
      },
    },
  });
}

export function setSentryUser(user: {
  id: string;
  workspaceId: string;
  email?: string;
}) {
  Sentry.setUser({
    id: user.id,
    workspace_id: user.workspaceId,
    email: user.email,
  });
}

export function setSentryContext(context: string, data: any) {
  Sentry.setContext(context, data);
}

export function captureRabbitMQError(
  error: Error,
  context: {
    serverId?: string;
    queueName?: string;
    exchange?: string;
    routingKey?: string;
    messageId?: string;
    operation?: string;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag("component", "rabbitmq");
    scope.setContext("rabbitmq", context);
    Sentry.captureException(error);
  });
}

export function captureMessageProcessingError(
  error: Error,
  context: {
    messageId?: string;
    queueName?: string;
    serverId?: string;
    operation?: string;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag("component", "message-processing");
    scope.setContext("message", context);
    Sentry.captureException(error);
  });
}

export function captureStreamingError(
  error: Error,
  context: {
    streamId?: string;
    userId?: string;
    serverId?: string;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag("component", "streaming");
    scope.setContext("stream", context);
    Sentry.captureException(error);
  });
}

export { Sentry };
