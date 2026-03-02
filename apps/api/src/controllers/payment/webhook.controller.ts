import { Hono } from "hono";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { StripeService } from "@/services/stripe/stripe.service";
import { processStripeWebhook } from "@/services/stripe/webhook-processor";

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

    // Check if event was already processed
    const existingEvent = await prisma.stripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existingEvent?.processed) {
      logger.info(
        { stripeEventId: event.id, eventType: event.type },
        "Webhook event already processed, skipping"
      );
      return c.json({ received: true, message: "Event already processed" });
    }

    // Use upsert to handle duplicate events gracefully
    // Only reset processed flag if it's a new event or if we're retrying a failed one
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      update: {
        eventType: event.type,
        data: JSON.stringify(event.data),
        retryCount: { increment: 1 },
        // Don't reset processed flag if it was already processed
        // Only update if it's a retry of a failed event
      },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        data: JSON.stringify(event.data),
      },
    });

    try {
      await processStripeWebhook(event);

      // Mark as processed only after successful processing
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      logger.info(
        { stripeEventId: event.id, eventType: event.type },
        "Webhook event processed successfully"
      );
    } catch (error) {
      // Log error but don't mark as processed
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await prisma.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          errorMessage,
        },
      });

      logger.error(
        { stripeEventId: event.id, error: errorMessage },
        "Webhook event processing failed"
      );

      // Re-throw to return error response
      throw error;
    }

    return c.json({ received: true });
  } catch (error) {
    logger.error({ error }, "Webhook error");
    return c.json({ message: "Webhook processing failed", error }, 400);
  }
});

export default app;
