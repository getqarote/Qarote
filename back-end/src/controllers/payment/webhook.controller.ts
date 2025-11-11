import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { StripeService } from "@/services/stripe/stripe.service";
import { processStripeWebhook } from "./webhook-processor";

const app = new Hono();

// Stripe webhook handler
app.post("/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  try {
    const body = await c.req.raw.text();
    logger.debug({ body }, "Stripe webhook body");

    const event = await StripeService.constructWebhookEvent(body, signature);
    logger.debug({ event }, "Stripe  event");

    // Use upsert to handle duplicate events gracefully
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      update: {
        eventType: event.type,
        data: JSON.stringify(event.data),
        processed: false, // Reset processed flag for retries
      },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        data: JSON.stringify(event.data),
      },
    });

    await processStripeWebhook(event);

    return c.json({ received: true });
  } catch (error) {
    logger.error({ error }, "Webhook error");
    return c.json({ message: "Webhook processing failed", error }, 400);
  }
});

export default app;
