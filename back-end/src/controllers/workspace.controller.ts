import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import coreRoutes from "./workspace/core.controller";
import privacyRoutes from "./workspace/privacy.controller";
import statsRoutes from "./workspace/stats.controller";
import dataRoutes from "./workspace/data.controller";
import planRoutes from "./workspace/plan.controller";

const workspaceController = new Hono();

// All routes in this controller require authentication
workspaceController.use("*", authenticate);

// Mount all workspace route modules
// IMPORTANT: Mount specific routes BEFORE the catch-all /:id route
// Plan routes must come before core routes because core has /:id catch-all
workspaceController.route("/", planRoutes);
workspaceController.route("/", privacyRoutes);
workspaceController.route("/", statsRoutes);
workspaceController.route("/", dataRoutes);
// Core routes last because it contains the catch-all /:id route
workspaceController.route("/", coreRoutes);

export default workspaceController;
