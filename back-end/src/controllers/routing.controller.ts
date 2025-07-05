import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import { requireRoutingEnabled } from "@/core/feature-flag/routing-feature-flag";
import { strictRateLimiter } from "@/middlewares/security";

const app = new Hono();

// Middleware to apply authentication and feature flag check to all routes
app.use("*", authenticate);
app.use("*", requireRoutingEnabled());

// Placeholder routes for routing visualization feature
// These will return proper responses when the routing feature is fully implemented

// Get topology data for visualization
app.get("/topology", async (c) => {
  // This is a placeholder - will be implemented when routing backend is ready
  return c.json({
    exchanges: [],
    queues: [],
    bindings: [],
    message:
      "Routing visualization topology endpoint will be implemented when backend is ready.",
  });
});

// Get real-time message flows
app.get("/flows", async (c) => {
  return c.json(
    {
      flows: [],
      message:
        "Real-time message flow endpoint will be implemented when routing backend is ready.",
    },
    501
  );
});

// Get routing metrics
app.get("/metrics", async (c) => {
  return c.json(
    {
      error: "Not implemented",
      message:
        "Routing metrics endpoint will be implemented when backend is ready.",
    },
    501
  );
});

// Start message flow simulation
app.post("/simulation/start", async (c) => {
  return c.json(
    {
      error: "Not implemented",
      message:
        "Message flow simulation endpoint will be implemented when backend is ready.",
    },
    501
  );
});

// Stop message flow simulation
app.post("/simulation/stop", async (c) => {
  return c.json(
    {
      error: "Not implemented",
      message:
        "Message flow simulation control will be implemented when backend is ready.",
    },
    501
  );
});

// Get exchange topology for specific server
app.get("/servers/:serverId/topology", async (c) => {
  const serverId = c.req.param("serverId");

  return c.json({
    serverId,
    exchanges: [],
    queues: [],
    bindings: [],
    message:
      "Server-specific topology endpoint will be implemented when routing backend is ready.",
  });
});

// Test routing pattern
app.post("/test-routing", async (c) => {
  return c.json(
    {
      error: "Not implemented",
      message:
        "Routing pattern testing endpoint will be implemented when backend is ready.",
    },
    501
  );
});

// Export routing diagram
app.post("/export", strictRateLimiter, async (c) => {
  return c.json(
    {
      error: "Not implemented",
      message:
        "Routing diagram export will be implemented when backend is ready.",
    },
    501
  );
});

export default app;
