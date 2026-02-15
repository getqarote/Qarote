import { sentryConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

// Initialize Sentry only if enabled and available.
// Sentry is marked as --external in the binary build (native profiling deps),
// so it won't be available in single-binary mode. Gracefully skip if missing.
if (isCloudMode() || sentryConfig.enabled) {
  try {
    const { initSentry } = await import("@/services/sentry/index.js");
    initSentry();
  } catch (err) {
    // In binary mode, Sentry native deps are excluded — import fails expectedly.
    // Log other errors so misconfiguration isn't silently swallowed.
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Cannot find") && !msg.includes("MODULE_NOT_FOUND")) {
      logger.warn("Sentry initialization failed: %s", msg);
    }
  }
}

import fs from "node:fs";
import path from "node:path";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { getDirname } from "@/core/utils";

import { ssoService } from "@/services/auth/sso.service";

import { corsMiddleware } from "@/middlewares/cors";
import {
  performanceMonitoring,
  requestIdMiddleware,
} from "@/middlewares/request";

import { serverConfig, ssoConfig } from "@/config";
import { validateDeploymentMode } from "@/config/deployment";

import { createContext } from "@/trpc/context";
import { appRouter } from "@/trpc/router";

import { standardRateLimiter } from "./middlewares/rateLimiter";

import healthcheckController from "@/controllers/healthcheck.controller";
import webhookController from "@/controllers/payment/webhook.controller";
import ssoController from "@/controllers/sso.controller";

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

// Create a separate app for SSO routes
// SAML ACS endpoint receives form-encoded POST from IdP (like webhook needs raw body)
const ssoApp = new Hono();
ssoApp.use(honoLogger());
ssoApp.use("*", secureHeaders());
ssoApp.use("*", requestIdMiddleware);
ssoApp.use("*", performanceMonitoring);
ssoApp.use("*", corsMiddleware);
ssoApp.use("*", standardRateLimiter);
ssoApp.route("/", ssoController);

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

// Mount SSO routes (SAML ACS needs form-encoded body access)
app.route("/sso", ssoApp);

// Mount tRPC router
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (_, c) => {
      return createContext({ req: c.req });
    },
  })
);

// 1. Health check (most basic)
app.route("/", healthcheckController);

// --- Self-hosted: Serve embedded frontend (binary + single-container mode) ---
// In non-cloud modes, if a public/ directory exists alongside the binary/dist,
// serve the frontend from it. This enables single-binary and single-container deployments.
//
// Resolution order for public/:
//   1. Next to the script (node dist/server.js → dist/public/)
//   2. Next to the binary (compiled Bun binary → <binary-dir>/public/)
//   3. Current working directory (./public/)
const __dirname = getDirname(import.meta.url);
const publicDir = [
  path.resolve(__dirname, "public"),
  path.resolve(path.dirname(process.execPath), "public"),
  path.resolve(process.cwd(), "public"),
].find((dir) => fs.existsSync(dir));

if (!isCloudMode() && publicDir) {
  // Serve runtime config (API URL for frontend to call)
  // Default to "" (empty string) so the frontend uses same-origin relative requests.
  // This works because in binary/self-hosted mode, API and frontend share the same port.
  // Users can override via API_URL env var for reverse-proxy setups.
  app.get("/config.js", (c) => {
    const apiUrl = process.env.API_URL || "";
    return c.text(
      `window.__QAROTE_CONFIG__=${JSON.stringify({ apiUrl })};`,
      200,
      { "Content-Type": "application/javascript" }
    );
  });

  // Serve static assets (CSS, JS, images)
  app.use("/assets/*", serveStatic({ root: publicDir }));
  app.use("/images/*", serveStatic({ root: publicDir }));

  // Try serving static files first, then fall back to index.html for SPA routes.
  // serveStatic with index only handles directory paths (e.g. /), not arbitrary
  // client-side routes like /dashboard. The fallback handler below catches those.
  app.get("*", serveStatic({ root: publicDir }));
  app.get("*", async (c) => {
    const indexPath = path.join(publicDir, "index.html");
    const html = fs.readFileSync(indexPath, "utf-8");
    return c.html(html);
  });

  logger.info(`Serving frontend from ${publicDir}`);
}

const { port, host } = serverConfig;

async function startServer() {
  try {
    // Validate deployment mode and required services
    validateDeploymentMode();
    logger.info("Deployment mode validation passed");

    await prisma.$connect();
    logger.info("Connected to database");

    // Initialize SSO service if enabled
    if (ssoConfig.enabled) {
      await ssoService.initialize();
    }

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
