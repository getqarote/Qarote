import { Hono } from "hono";
import { strictRateLimiter } from "@/middlewares/security";
import registrationRoutes from "./auth/registration.controller";
import sessionRoutes from "./auth/session.controller";
import verificationRoutes from "./auth/verification.controller";
import passwordRoutes from "./auth/password.controller";
import invitationRoutes from "./auth/invitation.controller";

const authController = new Hono();

// Apply strict rate limiting to auth endpoints for security
authController.use("*", strictRateLimiter);

authController.route("/", registrationRoutes);
authController.route("/", sessionRoutes);
authController.route("/", verificationRoutes);
authController.route("/", passwordRoutes);
authController.route("/invitation", invitationRoutes);

export default authController;
