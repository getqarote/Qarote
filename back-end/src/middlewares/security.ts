import { Context, Next } from "hono";
import { UserRole } from "@prisma/client";
import { rateLimiter } from "hono-rate-limiter";
import { v4 as uuidv4 } from "uuid";

// Cache for storing responses
// const responseCache = new Map<string, { data: any; timestamp: number }>();

// Performance monitoring thresholds
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second

/**
 * Middleware to ensure users can only access data from their own workspace
 * unless they are admin users
 */
// export const enforceWorkspaceIsolation = async (c: Context, next: Next) => {
//   const user = c.get("user");
//   const requestedWorkspaceId =
//     c.req.param("workspaceId") || c.req.query("workspaceId");

//   // Admin users can access any workspace
//   if (user.role === UserRole.ADMIN) {
//     await next();
//     return;
//   }

//   // Regular users can only access their own workspace
//   if (requestedWorkspaceId && requestedWorkspaceId !== user.workspaceId) {
//     return c.json(
//       {
//         error: "Access denied",
//         message: "Cannot access data from different workspace",
//       },
//       403
//     );
//   }

//   await next();
// };

/**
 * Middleware to ensure only admin users can perform write operations
 */
// export const requireAdminForWrites = async (c: Context, next: Next) => {
//   const user = c.get("user");
//   const method = c.req.method;

//   // Allow read operations for all authenticated users
//   if (method === "GET") {
//     await next();
//     return;
//   }

//   // Require admin for write operations (POST, PUT, DELETE, PATCH)
//   if (user.role !== UserRole.ADMIN) {
//     return c.json(
//       {
//         error: "Admin access required",
//         message: "Only admin users can perform write operations",
//       },
//       403
//     );
//   }

//   await next();
// };

/**
 * Middleware to log sensitive operations for audit trail
 */
// export const auditSensitiveOperations = async (c: Context, next: Next) => {
//   const user = c.get("user");
//   const method = c.req.method;
//   const path = c.req.path;

//   // Log write operations by admin users
//   if (method !== "GET" && user.role === UserRole.ADMIN) {
//     console.log(
//       `[AUDIT] Admin operation: ${method} ${path} by user ${user.id} (${user.email})`
//     );
//   }

//   await next();
// };

/**
 * Middleware to prevent privilege escalation in user updates
 */
export const preventPrivilegeEscalation = async (c: Context, next: Next) => {
  const user = c.get("user");
  const method = c.req.method;
  const path = c.req.path;

  // Only check for PUT/PATCH operations on user profiles
  if ((method === "PUT" || method === "PATCH") && path.includes("/profile")) {
    const body = await c.req.json();

    // Check for dangerous fields that users shouldn't be able to modify
    const dangerousFields = ["role", "workspaceId", "isActive", "permissions"];
    const hasDangerousFields = dangerousFields.some((field) => field in body);

    if (hasDangerousFields && user.role !== UserRole.ADMIN) {
      return c.json(
        {
          error: "Forbidden",
          message: "Cannot modify restricted user fields",
        },
        403
      );
    }
  }

  await next();
};

/**
 * Request ID middleware - adds unique ID to each request for tracing
 */
export const requestIdMiddleware = async (c: Context, next: Next) => {
  const requestId = uuidv4();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);

  console.log(`[REQUEST] ${requestId} ${c.req.method} ${c.req.path}`);

  await next();
};

/**
 * Performance monitoring middleware - logs slow requests
 */
export const performanceMonitoring = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const requestId = c.get("requestId") || "unknown";

  await next();

  const duration = Date.now() - startTime;

  if (duration > SLOW_REQUEST_THRESHOLD) {
    console.warn(
      `[SLOW_REQUEST] ${requestId} ${c.req.method} ${c.req.path} took ${duration}ms`
    );
  }

  c.header("X-Response-Time", `${duration}ms`);
};

/**
 * Cache middleware - caches GET responses for configurable duration
 */
// export const cacheMiddleware = (cacheDurationMs: number = 300000) => {
//   // 5 minutes default
//   return async (c: Context, next: Next) => {
//     const method = c.req.method;

//     // Only cache GET requests
//     if (method !== "GET") {
//       await next();
//       return;
//     }

//     const cacheKey = `${c.req.path}?${c.req.query()}`;
//     const cached = responseCache.get(cacheKey);
//     const now = Date.now();

//     // Return cached response if still valid
//     if (cached && now - cached.timestamp < cacheDurationMs) {
//       c.header("X-Cache", "HIT");
//       return c.json(cached.data);
//     }

//     // Execute request and cache response
//     await next();

//     // Only cache successful responses
//     if (c.res.status === 200) {
//       const responseData = await c.res.clone().json();
//       responseCache.set(cacheKey, {
//         data: responseData,
//         timestamp: now,
//       });
//       c.header("X-Cache", "MISS");

//       // Clean up old cache entries periodically
//       if (Math.random() < 0.01) {
//         // 1% chance
//         const cutoff = now - cacheDurationMs;
//         for (const [key, value] of responseCache.entries()) {
//           if (value.timestamp < cutoff) {
//             responseCache.delete(key);
//           }
//         }
//       }
//     }
//   };
// };

/**
 * Rate limiting using hono-rate-limiter
 */
export const createRateLimiter = (
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
 * Strict rate limiting for sensitive operations
 */
export const strictRateLimiter = createRateLimiter(
  60000, // 1 minute window
  5, // 10 requests max
  (c) => {
    const user = c.get("user");
    console.log(user);
    return `${user.id}:${c.req.method}:sensitive`;
  }
);

/**
 * Standard rate limiting for API endpoints
 */
export const standardRateLimiter = createRateLimiter(
  60000, // 1 minute window
  100 // 100 requests max
);
