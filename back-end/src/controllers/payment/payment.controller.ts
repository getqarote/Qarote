import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UserPlan } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authenticate } from "@/core/auth";
import { StripeService } from "@/services/stripe/stripe.service";
import { createCheckoutSessionSchema } from "@/schemas/payment";
import { strictRateLimiter } from "@/middlewares/security";
import { emailConfig } from "@/config";
import { getUserDisplayName } from "../shared";

const paymentController = new Hono();

paymentController.use("*", authenticate);
paymentController.use("*", strictRateLimiter);

// Create checkout session for subscription
paymentController.post(
  "/checkout",
  zValidator("json", createCheckoutSessionSchema),
  async (c) => {
    const user = c.get("user");
    const { plan, billingInterval } = c.req.valid("json");

    if (plan === UserPlan.FREE) {
      return c.json({ error: "Cannot create checkout for FREE plan" }, 400);
    }

    try {
      // Create Stripe customer if not exists
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await StripeService.createCustomer({
          email: user.email,
          name: getUserDisplayName(user),
          userId: user.id,
        });
        customerId = customer.id;

        // Update user with customer ID
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create checkout session
      const session = await StripeService.createCheckoutSession({
        userId: user.id,
        plan,
        billingInterval,
        successUrl: `${emailConfig.frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${emailConfig.frontendUrl}/payment/cancelled`,
        customerEmail: user.email,
      });

      return c.json({ url: session.url });
    } catch (error) {
      logger.error({ error }, "Error creating checkout session");
      return c.json({ error: "Failed to create checkout session" }, 500);
    }
  }
);

// Create customer portal session
paymentController.post("/portal", async (c) => {
  const user = c.get("user");

  if (!user.stripeCustomerId) {
    return c.json({ error: "No Stripe customer found" }, 400);
  }

  try {
    const session = await StripeService.createPortalSession(
      user.stripeCustomerId,
      `${emailConfig.frontendUrl}/profile?tab=billing`
    );

    return c.json({ url: session.url });
  } catch (error) {
    logger.error({ error }, "Error creating portal session");
    return c.json({ error: "Failed to create portal session" }, 500);
  }
});

export default paymentController;
