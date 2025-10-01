import { Hono } from "hono";
import paymentRoutes from "./payment/payment.controller";
import billingRoutes from "./payment/billing.controller";

const paymentController = new Hono();

// Mount sub-routes
paymentController.route("/", paymentRoutes);
paymentController.route("/", billingRoutes);

export default paymentController;
