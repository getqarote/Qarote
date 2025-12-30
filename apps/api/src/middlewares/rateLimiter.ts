import { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";

/**
 * Rate limiting using hono-rate-limiter
 */
const createRateLimiter = (
  windowMs: number = 60000, // 1 minute
  max: number = 100, // 100 requests per window
  keyGenerator?: (c: Context) => string
) => {
  return rateLimiter({
    windowMs,
    limit: max,
    standardHeaders: "draft-6",
    keyGenerator:
      keyGenerator ||
      ((c) => {
        const user = c.get("user");
        return user?.id || c.req.header("x-forwarded-for") || "anonymous";
      }),
    handler: (c) => {
      return c.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Try again later.`,
        },
        429
      );
    },
  });
};

/**
 * Standard rate limiting for API endpoints
 */
export const standardRateLimiter = createRateLimiter(
  60000, // 1 minute window
  100 // 100 requests max
);
