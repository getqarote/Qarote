import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import coreRoutes from "./workspace/core.controller";
import dataRoutes from "./workspace/data.controller";
import planRoutes from "./workspace/plan.controller";
import managementRoutes from "./workspace/management.controller";
import invitationRoutes from "./workspace/invitation.controller";

const workspaceController = new Hono();

// All routes in this controller require authentication
workspaceController.use("*", authenticate);

// Mount all workspace route modules
// IMPORTANT: Mount specific routes BEFORE the catch-all /:id route
// Plan routes and management routes must come before core routes because core has /:id catch-all
workspaceController.route("/", planRoutes);
workspaceController.route("/", managementRoutes);
workspaceController.route("/", dataRoutes);
workspaceController.route("/invitations", invitationRoutes);
// Core routes last because it contains the catch-all /:id route
workspaceController.route("/", coreRoutes);

export default workspaceController;
