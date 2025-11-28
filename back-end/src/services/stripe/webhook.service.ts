import { logger } from "@/core/logger";

import { stripeConfig } from "@/config";

import { CoreStripeService, Event, stripe } from "./core.service";

export class StripeWebhookService {
  /**
   * Construct and validate webhook event
   */
  static async constructWebhookEvent(
    payload: string,
    signature: string
  ): Promise<Event> {
    try {
      const webhookSecret = stripeConfig.webhookSecret;

      logger.info("Constructing Stripe webhook event");
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      // Set Sentry context for webhook processing
      CoreStripeService.setSentryContext("stripe_webhook", {
        eventType: event.type,
        eventId: event.id,
        created: event.created,
      });

      logger.info(
        {
          eventType: event.type,
          eventId: event.id,
        },
        "Stripe webhook event constructed successfully"
      );

      return event;
    } catch (error) {
      CoreStripeService.logStripeError(error, "webhook_construct", {
        hasPayload: !!payload,
        hasSignature: !!signature,
      });
      throw error;
    }
  }
}
