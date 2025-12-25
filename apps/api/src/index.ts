import { initSentry } from "@/services/sentry";

import { isCloudMode } from "@/config/deployment";

// Initialize Sentry only if enabled
if (isCloudMode() || process.env.ENABLE_SENTRY === "true") {
  initSentry();
}

import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { corsMiddleware } from "@/middlewares/cors";
import {
  performanceMonitoring,
  requestIdMiddleware,
} from "@/middlewares/request";

import { serverConfig } from "@/config";
import { validateDeploymentMode } from "@/config/deployment";

import { createContext } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

import { standardRateLimiter } from "./middlewares/rateLimiter";

import healthcheckController from "@/controllers/healthcheck.controller";
import webhookController from "@/controllers/payment/webhook.controller";

const app = new Hono();

// Create a completely separate app for webhooks
// This ensures NO middleware touches the raw body needed for Stripe signature verification
const webhookApp = new Hono();
// Only add essential middlewares that don't touch the body
webhookApp.use(honoLogger());
webhookApp.use("*", secureHeaders());
webhookApp.use("*", requestIdMiddleware);
webhookApp.use("*", performanceMonitoring);
webhookApp.use("*", corsMiddleware);
webhookApp.use("*", standardRateLimiter);
// NO prettyJSON middleware here - it would modify the body and break signature verification!
webhookApp.route("/", webhookController);

// Core middlewares for main app
app.use(honoLogger());
app.use("*", prettyJSON());
app.use("*", secureHeaders());
app.use("*", requestIdMiddleware);
app.use("*", performanceMonitoring);
app.use("*", corsMiddleware);
app.use("*", standardRateLimiter);

// Mount webhook app BEFORE other routes to ensure it's processed first
app.route("/webhooks", webhookApp);

// Mount tRPC router
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (opts, c) => {
      return createContext({ req: c.req });
    },
  })
);

// 1. Health check (most basic)
app.route("/", healthcheckController);

const { port, host } = serverConfig;

async function startServer() {
  try {
    // Validate deployment mode and required services
    validateDeploymentMode();
    logger.info("Deployment mode validation passed");

    await prisma.$connect();
    logger.info("Connected to database");

    serve(
      {
        fetch: app.fetch,
        port,
        hostname: host,
      },
      (info) => {
        logger.info(`Server is running on http://${info.address}:${info.port}`);
      }
    );
  } catch (error) {
    logger.error(error, "Failed to start server");
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  logger.info("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down server...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
