import { Context, Next } from "hono";
import { v4 as uuidv4 } from "uuid";

import { logger } from "@/core/logger";

import { trackMetricCount, trackMetricDistribution } from "@/services/sentry";

/**
 * Request ID middleware - adds unique ID to each request for tracing
 */
export const requestIdMiddleware = async (c: Context, next: Next) => {
  const requestId = uuidv4();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);

  logger.info(`[REQUEST] ${requestId} ${c.req.method} ${c.req.path}`);

  await next();
};

// Performance monitoring thresholds
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second

/**
 * Performance monitoring middleware - logs slow requests and tracks metrics
 */
export const performanceMonitoring = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const requestId = c.get("requestId") || "unknown";
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - startTime;

  // Track response time as distribution metric
  trackMetricDistribution("http.request.duration", duration, {
    tags: {
      method,
      path: normalizePath(path),
      status: String(c.res.status || 200),
    },
    unit: "millisecond",
  });

  // Track slow requests
  if (duration > SLOW_REQUEST_THRESHOLD) {
    logger.warn(
      `[SLOW_REQUEST] ${requestId} ${method} ${path} took ${duration}ms`
    );

    trackMetricCount("http.request.slow", 1, {
      tags: {
        method,
        path: normalizePath(path),
        status: String(c.res.status || 200),
        threshold: String(SLOW_REQUEST_THRESHOLD),
      },
    });
  }

  c.header("X-Response-Time", `${duration}ms`);
};

/**
 * Normalize path to reduce cardinality (e.g., /api/users/123 -> /api/users/:id)
 */
function normalizePath(path: string): string {
  // Remove UUIDs and numeric IDs from paths
  return path
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id"
    )
    .replace(/\/\d+/g, "/:id");
}
