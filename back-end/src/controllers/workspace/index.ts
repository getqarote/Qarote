import { Hono } from "hono";
import coreRoutes from "./core.controller";
import privacyRoutes from "./privacy.controller";
import statsRoutes from "./stats.controller";
import dataRoutes from "./data.controller";
import planRoutes from "./plan.controller";

const workspaceRoutes = new Hono();

// Mount all workspace route modules
workspaceRoutes.route("/", coreRoutes);
workspaceRoutes.route("/", privacyRoutes);
workspaceRoutes.route("/", statsRoutes);
workspaceRoutes.route("/", dataRoutes);
workspaceRoutes.route("/", planRoutes);

export default workspaceRoutes;
