import { initSentry } from "@/services/sentry";

import { isCloudMode } from "@/config/deployment";

// Initialize Sentry only if enabled
if (isCloudMode() || process.env.ENABLE_SENTRY === "true") {
  initSentry();
}

import { serve } from "@hono/node-server";
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

import { standardRateLimiter } from "./middlewares/rateLimiter";

import alertsController from "@/controllers/alerts.controller";
import authController from "@/controllers/auth.controller";
import discordController from "@/controllers/discord.controller";
import feedbackController from "@/controllers/feedback.controller";
import healthcheckController from "@/controllers/healthcheck.controller";
import licenseController from "@/controllers/license/license.controller";
import paymentController from "@/controllers/payment.controller";
import webhookController from "@/controllers/payment/webhook.controller";
import portalLicenseController from "@/controllers/portal/license-purchase.controller";
import publicInvitationController from "@/controllers/public-invitation.controller";
import rabbitmqController from "@/controllers/rabbitmq.controller";
import serverController from "@/controllers/server.controller";
import slackController from "@/controllers/slack.controller";
import userController from "@/controllers/user.controller";
import alertWebhookController from "@/controllers/webhook.controller";
import workspaceController from "@/controllers/workspace.controller";

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

// 1. Health check (most basic)
app.route("/", healthcheckController);

// 2. Authentication
app.route("/api/auth", authController);

// 3. Workspace-scoped routes (more specific first)
app.route("/api/workspaces/:workspaceId/servers", serverController);
app.route("/api/workspaces/:workspaceId/users", userController);
app.route("/api/workspaces/:workspaceId/payments", paymentController);
app.route("/api/workspaces/:workspaceId/alerts", alertsController);

// 4. Workspace base (less specific, after workspace-scoped routes)
app.route("/api/workspaces", workspaceController);

// 5. Core API routes
app.route("/api/rabbitmq", rabbitmqController);
app.route("/api/invitations", publicInvitationController);
app.route("/api/feedback", feedbackController);

// 6. Integrations
app.route("/api/slack", slackController);
app.route("/api/discord", discordController);

// 7. License & Portal
app.route("/api/license", licenseController);
app.route("/api/portal/licenses", portalLicenseController);

// 8. Webhooks
app.route("/api/webhooks", alertWebhookController);

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
