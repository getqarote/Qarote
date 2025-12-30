/**
 * Rate limiting middleware for tRPC procedures
 * Uses in-memory storage (can be enhanced with Redis in production)
 */

import { TRPCError } from "@trpc/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
// In production, this should be replaced with Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier for the rate limit (e.g., userId:endpoint)
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests allowed in the window
 * @returns true if rate limited, false otherwise
 */
function checkRateLimit(
  key: string,
  windowMs: number,
  max: number
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      limited: false,
      remaining: max - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= max) {
    return {
      limited: true,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    limited: false,
    remaining: max - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create a rate limiter middleware for tRPC procedures
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param max - Maximum number of requests allowed in the window (default: 100)
 * @param keyGenerator - Function to generate a unique key for rate limiting
 */
function createRateLimiter(
  windowMs: number = 60000,
  max: number = 100,
  keyGenerator?: (userId: string | null, path: string) => string
) {
  return async (opts: {
    ctx: { user?: { id: string } | null };
    path: string;
    type: string;
    next: () => Promise<unknown>;
  }): Promise<unknown> => {
    const { ctx, path, type, next } = opts;

    // Only rate limit queries and mutations, not subscriptions
    if (type !== "query" && type !== "mutation") {
      return next();
    }

    // Generate rate limit key
    const userId = ctx.user?.id || "anonymous";
    const key = keyGenerator
      ? keyGenerator(ctx.user?.id || null, path)
      : `${userId}:${path}`;

    // Check rate limit
    const result = checkRateLimit(key, windowMs, max);

    if (result.limited) {
      const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        cause: {
          resetIn,
          resetAt: result.resetAt,
        },
      });
    }

    return next();
  };
}

/**
 * Standard rate limiting for API endpoints
 * 100 requests per minute
 */
export const standardRateLimiter = createRateLimiter(
  60000, // 1 minute window
  100 // 100 requests max
);

/**
 * Strict rate limiting for sensitive operations (payments, cancellations)
 * 5 requests per minute
 */
export const strictRateLimiter = createRateLimiter(
  60000, // 1 minute window
  5, // 5 requests max
  (userId, path) => {
    return userId
      ? `${userId}:${path}:sensitive`
      : `anonymous:${path}:sensitive`;
  }
);

/**
 * Moderate rate limiting for billing overview and less sensitive operations
 * 30 requests per minute
 */
export const billingRateLimiter = createRateLimiter(
  60000, // 1 minute window
  30, // 30 requests max
  (userId) => {
    return userId ? `${userId}:billing` : `anonymous:billing`;
  }
);
