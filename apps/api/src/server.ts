import fs from "node:fs";
import path from "node:path";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import { auth } from "@/core/better-auth";
import { bootstrapAdmin } from "@/core/bootstrap-admin";
import { bootstrapSso } from "@/core/bootstrap-sso";
import { logger } from "@/core/logger";
import { runMigrations } from "@/core/migrate";
import { configurePostgresTimeouts, prisma } from "@/core/prisma";
import { getDirname } from "@/core/utils";

import { DeploymentService } from "@/services/deployment/deployment.service";

import { corsMiddleware } from "@/middlewares/cors";
import {
  performanceMonitoring,
  requestIdMiddleware,
} from "@/middlewares/request";

import { config, serverConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

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

// Mount webhook app BEFORE other routes to ensure it's processed first
app.route("/webhooks", webhookApp);

// Mount better-auth handler (handles /api/auth/* routes for sign-in, sign-up, OAuth callbacks,
// and SSO callbacks: OIDC /api/auth/sso/callback/{providerId},
// SAML ACS /api/auth/sso/saml2/callback/{providerId})
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Rate limit API routes only (not static assets/locales/SPA files)
app.use("/trpc/*", standardRateLimiter);

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
    // Always serve normalized mode ("cloud" or "selfhosted")
    const deploymentMode = config.DEPLOYMENT_MODE;
    return c.text(
      `window.__QAROTE_CONFIG__=${JSON.stringify({ apiUrl, deploymentMode })};`,
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
  let dbConnected = false;
  try {
    // Apply pending database migrations if a migrations/ directory exists.
    // Only the binary tarball ships this directory — Docker/Dokku/cloud
    // deployments use `prisma migrate deploy` via their own scripts instead.
    await runMigrations(config.DATABASE_URL);

    await prisma.$connect();
    dbConnected = true;
    logger.info("Connected to database");

    // Configure PostgreSQL timeouts to prevent zombie connections
    await configurePostgresTimeouts();

    // Bootstrap admin account on first boot (if configured via setup CLI)
    await bootstrapAdmin();

    // Migrate legacy SSO data and seed instance-wide provider from env vars
    await bootstrapSso();

    // Initialize deployment method detection for update notifications
    await DeploymentService.initialize();

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
    logger.error({ error }, "Failed to start server");
    if (dbConnected) {
      await prisma.$disconnect();
    }
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
