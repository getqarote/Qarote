import { Context, Next } from "hono";

/**
 * Routing Feature Flag
 *
 * Controls access to the routing visualization feature based on environment.
 * - Production: Routing is disabled (coming soon)
 * - Development: Routing is fully enabled
 */

/**
 * Check if routing feature is enabled based on the current environment
 * @returns true if routing is enabled, false otherwise
 */
export const isRoutingEnabled = (): boolean => {
  const nodeEnv = process.env.NODE_ENV || "development";

  // Enable routing only in development
  return nodeEnv === "development";
};

/**
 * Get the environment name for debugging/logging
 * @returns current environment name
 */
export const getCurrentEnvironment = (): string => {
  return process.env.NODE_ENV || "development";
};

/**
 * Middleware to check if routing feature is enabled
 * Returns 403 with appropriate message if disabled
 */
export const requireRoutingEnabled = () => {
  return async (c: Context, next: Next) => {
    if (!isRoutingEnabled()) {
      return c.json(
        {
          error: "Feature not available",
          message:
            "Routing visualization feature is coming soon. Currently available in development mode only.",
          environment: getCurrentEnvironment(),
        },
        403
      );
    }
    await next();
  };
};
