import { Hono } from "hono";
import { authorize } from "@/core/auth";
import { UserRole } from "@prisma/client";
import { logger } from "@/core/logger";
import { createErrorResponse } from "../shared";

const adminController = new Hono();

// Apply authentication and plan validation middleware
adminController.use("*", authorize([UserRole.ADMIN]));

// All streaming-related admin endpoints have been removed
// This controller is reserved for future admin functionality

export default adminController;
