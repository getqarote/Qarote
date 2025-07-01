import { Hono } from "hono";
import { authMiddleware } from "@/middlewares/auth";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";

const app = new Hono();

// Get subscription details
app.get("/subscription", authMiddleware, async (c) => {
  const user = c.get("user");

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: user.workspaceId },
    });

    if (!subscription) {
      return c.json({ subscription: null });
    }

    return c.json({ subscription });
  } catch (error) {
    logger.error("Error fetching subscription:", error);
    return c.json({ error: "Failed to fetch subscription" }, 500);
  }
});

// Get payment history
app.get("/payments", authMiddleware, async (c) => {
  const user = c.get("user");
  const limit = parseInt(c.req.query("limit") || "20");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const payments = await prisma.payment.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.payment.count({
      where: { workspaceId: user.workspaceId },
    });

    return c.json({
      payments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error("Error fetching payments:", error);
    return c.json({ error: "Failed to fetch payments" }, 500);
  }
});

export default app;
