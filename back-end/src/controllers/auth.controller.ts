import { Hono } from "hono";

import emailRoutes from "./auth/email.controller";
import googleRoutes from "./auth/google.controller";
import invitationRoutes from "./auth/invitation.controller";
import passwordRoutes from "./auth/password.controller";
import registrationRoutes from "./auth/registration.controller";
import sessionRoutes from "./auth/session.controller";
import verificationRoutes from "./auth/verification.controller";

const authController = new Hono();

authController.route("/", registrationRoutes);
authController.route("/", sessionRoutes);
authController.route("/", verificationRoutes);
authController.route("/", passwordRoutes);
authController.route("/", emailRoutes);
authController.route("/", googleRoutes);
authController.route("/invitation", invitationRoutes);

export default authController;
