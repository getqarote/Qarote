import { Context, Next } from "hono";

export const requireRole = (role: string) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user || user.role !== role) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  };
};
