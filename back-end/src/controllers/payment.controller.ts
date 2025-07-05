import { Hono } from "hono";
import { strictRateLimiter } from "@/middlewares/security";
import paymentRoutes from "./payment/payment.controller";
import billingRoutes from "./payment/billing.controller";
import webhookRoutes from "./payment/webhook.controller";

const paymentController = new Hono();

// Apply strict rate limiting to payment endpoints for security
paymentController.use("*", strictRateLimiter);

// Mount sub-routes
paymentController.route("/", paymentRoutes);
paymentController.route("/", billingRoutes);
paymentController.route("/", webhookRoutes);

export default paymentController;
