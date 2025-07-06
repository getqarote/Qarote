import { Hono } from "hono";
import paymentRoutes from "./payment/payment.controller";
import billingRoutes from "./payment/billing.controller";
import webhookRoutes from "./payment/webhook.controller";

const paymentController = new Hono();

// Mount sub-routes
paymentController.route("/", paymentRoutes);
paymentController.route("/", billingRoutes);
paymentController.route("/", webhookRoutes);

export default paymentController;
