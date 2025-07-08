import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/core/logger";
import { config, sentryConfig } from "@/config";

const prisma = new PrismaClient();

const healthcheckController = new Hono();

healthcheckController.get("/livez", (c) =>
  c.json({ status: "ok", message: "RabbitMQ Dashboard API is live" })
);

healthcheckController.get("/readyz", (c) => {
  return c.json({
    status: "ready",
    timestamp: new Date().toISOString(),
    message: "Service is ready to accept traffic",
  });
});

healthcheckController.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const memoryUsage = process.memoryUsage();

    const healthCheck = {
      status: "ok",
      message: "RabbitMQ Dashboard API is healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
      database: {
        status: "connected",
        type: "postgresql",
      },
      memory: {
        used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        unit: "MB",
      },
      services: {
        database: "healthy",
        api: "healthy",
        sentry: sentryConfig.enabled ? "enabled" : "disabled",
      },
    };

    return c.json(healthCheck, 200);
  } catch (error) {
    logger.error("Health check failed:", error);

    return c.json(
      {
        status: "error",
        message: "Service unavailable",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
        database: {
          status: "disconnected",
          type: "postgresql",
        },
      },
      503
    );
  }
});

export default healthcheckController;
