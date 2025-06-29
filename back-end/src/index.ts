import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

import serverController from "./controllers/server.controller";
import rabbitmqController from "./controllers/rabbitmq";
import alertController from "./controllers/alert.controller";
import authController from "./controllers/auth.controller";
import userController from "./controllers/user.controller";
import workspaceController from "./controllers/workspace.controller";
import logsController from "./controllers/logs.controller";
import routingController from "./controllers/routing.controller";
import feedbackController from "./controllers/feedback.controller";
import invitationController from "./controllers/invitation.controller";
import paymentController from "./controllers/payment.controller";
import { messageHistoryController } from "./controllers/message-history.controller";

import { corsMiddleware } from "./middlewares/cors";
// import { alertService } from "./services/alert.service";
// import { TemporaryStorage } from "./core/privacy";
import { streamRegistry } from "./core/DatabaseStreamRegistry";

dotenv.config();

const prisma = new PrismaClient();

const app = new Hono();

app.use(logger());
app.use("*", corsMiddleware);
app.use("*", prettyJSON());
app.use("*", secureHeaders());

app.route("/api/servers", serverController);
app.route("/api/rabbitmq", rabbitmqController);
app.route("/api/alerts", alertController);
app.route("/api/auth", authController);
app.route("/api/users", userController);
app.route("/api/workspaces", workspaceController);
app.route("/api/logs", logsController);
app.route("/api/routing", routingController);
app.route("/api/feedback", feedbackController);
app.route("/api/invitations", invitationController);
app.route("/api/payments", paymentController);
app.route("/api/message-history", messageHistoryController);

app.get("/livez", (c) =>
  c.json({ status: "ok", message: "RabbitMQ Dashboard API" })
);

const port = parseInt(process.env.PORT!);
const host = process.env.HOST;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Connected to database");

    // Start the alert monitoring service
    // alertService.start();

    // Initialize periodic cache cleanup (every hour)
    // const cleanupInterval = TemporaryStorage.startPeriodicCleanup(60);
    // console.log("Cache cleanup service started (runs every 60 minutes)");

    serve(
      {
        fetch: app.fetch,
        port,
        hostname: host,
      },
      (info) => {
        console.log(`Server is running on http://${info.address}:${info.port}`);
      }
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  // alertService.stop();
  await prisma.$disconnect();
  await streamRegistry.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  // alertService.stop();
  await prisma.$disconnect();
  await streamRegistry.cleanup();
  process.exit(0);
});

startServer();
