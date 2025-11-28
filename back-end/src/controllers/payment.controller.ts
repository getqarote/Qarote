import { Hono } from "hono";

import billingRoutes from "./payment/billing.controller";
import paymentRoutes from "./payment/payment.controller";

const paymentController = new Hono();

// Mount sub-routes
paymentController.route("/", paymentRoutes);
paymentController.route("/", billingRoutes);

export default paymentController;
