// Sentry instrumentation — loaded via --import BEFORE any application modules.
//
// Sentry must be initialized before instrumented modules (http, prisma, pino)
// are imported, otherwise auto-instrumentation hooks silently fail.
//
// This file:
//   1. Loads dotenv (env vars aren't available yet at --import time)
//   2. Checks SENTRY_ENABLED / SENTRY_DSN from process.env
//   3. Calls Sentry.init() synchronously so monkey-patching happens first
//   4. Uses require() for @sentry/node — in binary mode (Bun --compile) the
//      package is excluded via --external and won't exist at runtime.

import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });

const enabled = process.env.SENTRY_ENABLED === "true";
const dsn = process.env.SENTRY_DSN?.trim();

if (
  enabled &&
  dsn &&
  dsn !== "https://" &&
  dsn.startsWith("https://") &&
  dsn.length >= 20
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/node");

    let profilingIntegration = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { nodeProfilingIntegration } = require("@sentry/profiling-node");
      profilingIntegration = nodeProfilingIntegration();
    } catch {
      // Profiling native module not available — skip silently
    }

    const env = process.env.NODE_ENV || "development";
    const integrations = [
      Sentry.httpIntegration(),
      Sentry.prismaIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
      Sentry.pinoIntegration(),
    ];

    if (profilingIntegration) {
      integrations.unshift(profilingIntegration);
    }

    Sentry.init({
      dsn,
      environment: env,
      enableLogs: true,
      enableMetrics: true,
      tracesSampleRate: env === "production" ? 0.1 : 1.0,
      profilesSampleRate: env === "production" ? 0.05 : 1.0,
      integrations,
      beforeSend(event: {
        request?: { headers?: Record<string, string> };
        exception?: { values?: { value?: string }[] };
      }) {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        if (event.exception?.values?.[0]?.value?.includes("health")) {
          return null;
        }
        return event;
      },
      beforeSendLog(log: { message?: string }) {
        if (
          log.message &&
          typeof log.message === "string" &&
          log.message.toLowerCase().includes("health")
        ) {
          return null;
        }
        return log;
      },
      release: `qarote-backend@${process.env.npm_package_version || "unknown"}`,
      initialScope: {
        tags: {
          component: "backend",
          service: "qarote-api",
        },
      },
    });
  } catch {
    // @sentry/node not available (binary mode) — continue without instrumentation
  }
}
