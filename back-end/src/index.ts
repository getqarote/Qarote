import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

import serverController from "./controllers/server.controller";
import rabbitmqController from "./controllers/rabbitmq.controller";
import alertController from "./controllers/alert.controller";
import authController from "./controllers/auth.controller";
import userController from "./controllers/user.controller";
import companyController from "./controllers/company.controller";

import { corsMiddleware } from "./middlewares/cors";
import { alertService } from "./services/alert.service";

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Hono app
const app = new Hono();

// Global middlewares
app.use(logger());
app.use("*", corsMiddleware);
app.use("*", prettyJSON());
app.use("*", secureHeaders());

// Routes
app.route("/api/servers", serverController);
app.route("/api/rabbitmq", rabbitmqController);
app.route("/api/alerts", alertController);
app.route("/api/auth", authController);
app.route("/api/users", userController);
app.route("/api/companies", companyController);

// Health check endpoint
app.get("/livez", (c) =>
  c.json({ status: "ok", message: "RabbitMQ Dashboard API" })
);

// Start the server
const port = parseInt(process.env.PORT!);
const host = process.env.HOST;

// Connect to database and start server
async function startServer() {
  try {
    // Connect to Prisma
    await prisma.$connect();
    console.log("Connected to database");

    // Start the alert monitoring service
    // alertService.start();

    // Start the server
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

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  // alertService.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  alertService.stop();
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();
