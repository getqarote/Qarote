import { Context, Next } from "hono";
import { authenticate as coreAuthenticate } from "../core/auth";

// Re-export the core authenticate function as middleware
export const authMiddleware = coreAuthenticate;

export const requireRole = (role: string) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user || user.role !== role) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  };
};
