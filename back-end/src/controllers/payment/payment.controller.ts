import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authenticate } from "@/core/auth";
import { StripeService } from "@/services/stripe/stripe.service";
import { WorkspacePlan } from "@prisma/client";
import { createCheckoutSessionSchema } from "@/schemas/payment";
import { emailConfig } from "@/config";
import { strictRateLimiter } from "@/middlewares/security";
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

    // Get workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    if (plan === WorkspacePlan.FREE) {
      return c.json({ error: "Cannot create checkout for FREE plan" }, 400);
    }

    try {
      // Create Stripe customer if not exists
      let customerId = workspace.stripeCustomerId;
      if (!customerId) {
        const customer = await StripeService.createCustomer({
          email: user.email,
          name: getUserDisplayName(user),
          workspaceId: workspace.id,
        });
        customerId = customer.id;

        // Update workspace with customer ID
        await prisma.workspace.update({
          where: { id: workspace.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Create checkout session
      const session = await StripeService.createCheckoutSession({
        workspaceId: workspace.id,
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

  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
  });

  if (!workspace?.stripeCustomerId) {
    return c.json({ error: "No Stripe customer found" }, 404);
  }

  try {
    const session = await StripeService.createPortalSession(
      workspace.stripeCustomerId,
      `${emailConfig.frontendUrl}/profile?tab=billing`
    );

    return c.json({ url: session.url });
  } catch (error) {
    logger.error({ error }, "Error creating portal session");
    return c.json({ error: "Failed to create portal session" }, 500);
  }
});

export default paymentController;
