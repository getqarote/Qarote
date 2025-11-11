import { initSentry } from "@/services/sentry";
initSentry();

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { PrismaClient } from "@prisma/client";
import { logger } from "@/core/logger";
import { serverConfig } from "@/config";

import serverController from "@/controllers/server.controller";
import rabbitmqController from "@/controllers/rabbitmq.controller";
import authController from "@/controllers/auth.controller";
import userController from "@/controllers/user.controller";
import workspaceController from "@/controllers/workspace.controller";
import publicInvitationController from "@/controllers/public-invitation.controller";
import feedbackController from "@/controllers/feedback.controller";
import paymentController from "@/controllers/payment.controller";
import webhookController from "@/controllers/payment/webhook.controller";
import healthcheckController from "@/controllers/healthcheck.controller";
import discourseController from "@/controllers/discourse.controller";

import { corsMiddleware } from "@/middlewares/cors";
import {
  requestIdMiddleware,
  performanceMonitoring,
} from "@/middlewares/request";
import { standardRateLimiter } from "./middlewares/rateLimiter";
// import { alertService } from "./services/alert.service";
// import { TemporaryStorage } from "./core/privacy";

const prisma = new PrismaClient();

const app = new Hono();

// Core middlewares - applied to all routes
app.use(honoLogger());
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/webhooks")) {
    // Skip prettyJSON for webhook routes to preserve raw body
    await next();
  } else {
    // Apply prettyJSON for all other routes
    return prettyJSON()(c, next);
  }
});
app.use("*", secureHeaders());
app.use("*", requestIdMiddleware);
app.use("*", performanceMonitoring);
app.use("*", corsMiddleware);
app.use("*", standardRateLimiter);

// endpoint routes
app.route("/api/servers", serverController);
app.route("/api/rabbitmq", rabbitmqController);
app.route("/api/auth", authController);
app.route("/api/users", userController);
app.route("/api/workspaces", workspaceController);
app.route("/api/invitations", publicInvitationController);
app.route("/api/feedback", feedbackController);
app.route("/api/payments", paymentController);
app.route("/api/discourse", discourseController);
app.route("/webhooks", webhookController);
app.route("/", healthcheckController);

const { port, host } = serverConfig;

async function startServer() {
  try {
    await prisma.$connect();
    logger.info("Connected to database");

    // Start the alert monitoring service
    // alertService.start();

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
  // alertService.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down server...");
  // alertService.stop();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
