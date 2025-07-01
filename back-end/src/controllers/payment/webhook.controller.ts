import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { StripeService } from "@/services/stripe.service";
import { processStripeWebhook } from "./webhook-processor";

const app = new Hono();

// Stripe webhook handler
app.post("/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  try {
    const body = await c.req.text();
    const event = await StripeService.constructWebhookEvent(body, signature);

    // Store webhook event
    await prisma.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        data: JSON.stringify(event.data),
      },
    });

    await processStripeWebhook(event);

    return c.json({ received: true });
  } catch (error) {
    logger.error("Webhook error:", error);
    return c.json({ error: "Webhook processing failed" }, 400);
  }
});

export default app;
