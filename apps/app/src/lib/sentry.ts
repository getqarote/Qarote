import * as Sentry from "@sentry/react";

import { logger } from "@/lib/logger";

export function initSentry() {
  // Only initialize Sentry in production or when explicitly enabled
  if (
    import.meta.env.MODE !== "production" &&
    import.meta.env.VITE_SENTRY_ENABLED === "false"
  ) {
    return;
  }

  if (!import.meta.env.VITE_SENTRY_DSN) {
    logger.warn("Sentry DSN not provided - monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,

    integrations: [
      // React integration for component error boundaries
      Sentry.browserTracingIntegration(),

      // Replay integration for session recordings (in production only)
      ...(import.meta.env.MODE === "production"
        ? [
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ]
        : []),
    ],

    // Configure what gets sent to Sentry
    beforeSend(event) {
      // Filter out development errors
      if (import.meta.env.MODE === "development" && event.level === "warning") {
        return null;
      }

      // Don't send HMR errors
      if (event.exception?.values?.[0]?.value?.includes("HMR")) {
        return null;
      }

      // Don't send network timeouts for development
      if (
        import.meta.env.MODE === "development" &&
        event.exception?.values?.[0]?.value?.includes("timeout")
      ) {
        return null;
      }

      // Don't send authentication-related errors (invalid/expired tokens, authentication required)
      const errorValue = event.exception?.values?.[0]?.value || "";
      const errorType = event.exception?.values?.[0]?.type || "";
      const errorMessage = event.message || "";

      // Check if it's an authentication-related error
      if (
        errorValue.includes("Invalid or expired token") ||
        errorValue.includes("expired token") ||
        errorValue.includes("Invalid token") ||
        errorValue.includes("Authentication required") ||
        errorMessage.includes("Invalid or expired token") ||
        errorMessage.includes("Authentication required") ||
        (errorType === "ApiErrorWithCode" &&
          (errorValue.toLowerCase().includes("token") ||
            errorValue.toLowerCase().includes("authentication required") ||
            errorMessage.toLowerCase().includes("token") ||
            errorMessage.toLowerCase().includes("authentication required")))
      ) {
        return null;
      }

      return event;
    },

    // Set release information
    release: `qarote-frontend@${import.meta.env.VITE_APP_VERSION}`,

    // Configure tags
    initialScope: {
      tags: {
        component: "frontend",
        service: "qarote-front",
      },
    },
  });
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

export function setSentryContext(
  context: string,
  data: Record<string, unknown>
) {
  Sentry.setContext(context, data);
}

// Error Boundary Component
export const SentryErrorBoundary = Sentry.withErrorBoundary;

// High-Order Component for profiling
export const withSentryProfiling = Sentry.withProfiler;
