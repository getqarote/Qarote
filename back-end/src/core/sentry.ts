import Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logger } from "./logger";
import { sentryConfig } from "@/config";

// Map Pino levels to Sentry levels
const PINO_TO_SENTRY_LEVEL: Record<number, Sentry.SeverityLevel> = {
  10: "debug", // trace
  20: "debug", // debug
  30: "info", // info
  40: "warning", // warn
  50: "error", // error
  60: "fatal", // fatal
};

// Create a Sentry transport for Pino that forwards logs to Sentry
function createSentryTransport() {
  return {
    level: "info", // Forward all logs by default
    stream: {
      write: (chunk: string) => {
        try {
          const logObj = JSON.parse(chunk);
          const client = Sentry.getClient();

          if (!client) return;

          // Skip health check logs to reduce noise
          if (
            logObj.msg &&
            typeof logObj.msg === "string" &&
            logObj.msg.toLowerCase().includes("health")
          ) {
            return;
          }

          const sentryLevel = PINO_TO_SENTRY_LEVEL[logObj.level] || "info";
          const message = logObj.msg || "Log message";

          // Extract error information if present
          const error = logObj.err || logObj.error || logObj.errorDetails;

          // Create extras object without sensitive or circular data
          const extras: Record<string, any> = {};
          for (const [key, value] of Object.entries(logObj)) {
            if (
              ![
                "msg",
                "level",
                "time",
                "pid",
                "hostname",
                "err",
                "error",
                "errorDetails",
              ].includes(key)
            ) {
              try {
                // Ensure the value is serializable
                JSON.stringify(value);
                extras[key] = value;
              } catch {
                // Skip non-serializable values
              }
            }
          }

          if (error && error.message) {
            // Capture as exception for better error tracking
            const sentryError =
              error instanceof Error ? error : new Error(error.message);
            if (error.stack) sentryError.stack = error.stack;

            Sentry.captureException(sentryError, {
              level: sentryLevel,
              tags: {
                logger: "pino",
                component: extras.component || "backend",
              },
              extra: { ...extras, originalMessage: message },
            });
          } else {
            // Capture as message
            Sentry.captureMessage(message, {
              level: sentryLevel,
              tags: {
                logger: "pino",
                component: extras.component || "backend",
              },
              extra: extras,
            });
          }
        } catch {
          // Never let logging integration throw
        }
      },
    },
  };
}

// Patch the existing logger to add Sentry transport
function patchLoggerForSentry(pinoLogger: any) {
  if (pinoLogger._sentryPatched) return;

  try {
    const sentryTransport = createSentryTransport();

    // Get current transports
    const currentTransports = pinoLogger[Symbol.for("pino.transports")] || [];

    // Add Sentry transport to existing transports
    pinoLogger[Symbol.for("pino.transports")] = [
      ...currentTransports,
      sentryTransport,
    ];

    pinoLogger._sentryPatched = true;
  } catch {
    // Fallback: patch individual methods if transport approach fails
    const levels = ["trace", "debug", "info", "warn", "error", "fatal"];

    levels.forEach((level) => {
      const original = pinoLogger[level];
      if (typeof original === "function") {
        pinoLogger[level] = function (...args: any[]) {
          const result = original.apply(this, args);

          // Forward to Sentry for warn and above
          if (["warn", "error", "fatal"].includes(level)) {
            try {
              const client = Sentry.getClient();
              if (client) {
                const [first, ...rest] = args;
                let message = "";
                let error: Error | undefined;
                let extras: any = {};

                if (typeof first === "string") {
                  message = first;
                  // Look for error in remaining args
                  const errorArg = rest.find(
                    (arg) =>
                      arg instanceof Error ||
                      (arg && typeof arg === "object" && arg.message)
                  );
                  if (errorArg)
                    error =
                      errorArg instanceof Error
                        ? errorArg
                        : new Error(errorArg.message);
                } else if (first && typeof first === "object") {
                  error = first.err || first.error || first.errorDetails;
                  message = args[1] || first.msg || "Log message";
                  extras = { ...first };
                  delete extras.err;
                  delete extras.error;
                  delete extras.errorDetails;
                  delete extras.msg;
                }

                if (error) {
                  Sentry.captureException(error, {
                    level:
                      PINO_TO_SENTRY_LEVEL[pinoLogger.levels.values[level]] ||
                      "info",
                    tags: { logger: "pino" },
                    extra: { ...extras, message },
                  });
                } else if (message) {
                  Sentry.captureMessage(message, {
                    level:
                      PINO_TO_SENTRY_LEVEL[pinoLogger.levels.values[level]] ||
                      "info",
                    tags: { logger: "pino" },
                    extra: extras,
                  });
                }
              }
            } catch {
              // Never let logging integration throw
            }
          }

          return result;
        };
      }
    });

    pinoLogger._sentryPatched = true;
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
    release: sentryConfig.release,

    // Configure tags
    initialScope: {
      tags: {
        component: "backend",
        service: "rabbithq-api",
      },
    },
  });

  // Patch the existing Pino logger to forward logs to Sentry
  try {
    patchLoggerForSentry(logger);
  } catch {
    // Don't fail initialization if patching fails
  }
}

export function setSentryUser(user: {
  id: string;
  workspaceId: string | null;
  email?: string;
}) {
  Sentry.setUser({
    id: user.id,
    workspace_id: user.workspaceId || undefined,
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
