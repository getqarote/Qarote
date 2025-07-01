import { Hono } from "hono";
import paymentRoutes from "./payment/payment.controller";
import billingRoutes from "./payment/billing.controller";
import webhookRoutes from "./payment/webhook.controller";

const app = new Hono();

// Mount sub-routes
app.route("/", paymentRoutes);
app.route("/", billingRoutes);
app.route("/", webhookRoutes);

export default app;
