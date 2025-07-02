import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import workspaceRoutes from "./workspace";

const workspaceController = new Hono();

// All routes in this controller require authentication
workspaceController.use("*", authenticate);

// Mount all workspace routes
workspaceController.route("/", workspaceRoutes);

export default workspaceController;
