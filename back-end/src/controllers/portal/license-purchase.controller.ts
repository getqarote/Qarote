/**
 * Portal License Controller
 * Handles license purchases and management for Customer Portal
 */

import { zValidator } from "@hono/zod-validator";
import { UserPlan } from "@prisma/client";
import { Hono } from "hono";

import { authenticate } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { licenseService } from "@/services/license/license.service";
import { stripe, StripeService } from "@/services/stripe/stripe.service";

import { purchaseLicenseSchema } from "@/schemas/portal";

import { emailConfig, stripeConfig } from "@/config";

const portalLicenseController = new Hono();

// Apply authentication to all routes
portalLicenseController.use("*", authenticate);

// Get all licenses for the authenticated user
portalLicenseController.get("/", async (c) => {
  const user = c.get("user");

  try {
    const licenses = await licenseService.getLicensesForUser(
      user.email,
      user.workspaceId || undefined
    );

    return c.json({ licenses });
  } catch (error) {
    logger.error({ error }, "Error fetching licenses");
    return c.json({ error: "Failed to fetch licenses" }, 500);
  }
});

// Purchase license endpoint
portalLicenseController.post(
  "/purchase",
  zValidator("json", purchaseLicenseSchema),
  async (c) => {
    const user = c.get("user");
    const { tier, billingInterval } = c.req.valid("json");

    try {
      // Create Stripe customer if not exists
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await StripeService.createCustomer({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          userId: user.id,
        });
        customerId = customer.id;

        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Get price ID based on tier and billing interval
      const priceId =
        billingInterval === "monthly"
          ? tier === UserPlan.DEVELOPER
            ? stripeConfig.priceIds.developer.monthly
            : stripeConfig.priceIds.enterprise.monthly
          : tier === UserPlan.DEVELOPER
            ? stripeConfig.priceIds.developer.yearly
            : stripeConfig.priceIds.enterprise.yearly;

      // For licenses, calculate expiration date based on billing interval
      const expiresAt = new Date();
      if (billingInterval === "monthly") {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      // Create Stripe Checkout Session for one-time license purchase (payment mode)

      const session = await stripe.checkout.sessions.create({
        mode: "payment", // One-time payment for licenses
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${emailConfig.frontendUrl}/portal/licenses?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${emailConfig.frontendUrl}/portal/purchase`,
        customer: customerId,
        metadata: {
          userId: user.id,
          plan: tier,
          billingInterval,
          type: "license", // Mark as license purchase
          expiresAt: expiresAt.toISOString(),
        },
      });

      return c.json({ checkoutUrl: session.url });
    } catch (error) {
      logger.error({ error }, "Error creating license purchase checkout");
      return c.json({ error: "Failed to create checkout session" }, 500);
    }
  }
);

// Download license file
portalLicenseController.get("/:id/download", async (c) => {
  const user = c.get("user");
  const licenseId = c.req.param("id");

  try {
    const licenses = await licenseService.getLicensesForUser(
      user.email,
      user.workspaceId || undefined
    );

    const license = licenses.find((l) => l.id === licenseId);

    if (!license) {
      return c.json({ error: "License not found" }, 404);
    }

    // Generate license file content
    const licenseContent = `RabbitHQ License
================

License Key: ${license.licenseKey}
Tier: ${license.tier}
Customer Email: ${license.customerEmail}
Expires: ${license.expiresAt ? license.expiresAt.toISOString() : "Never"}
Issued: ${license.createdAt.toISOString()}

To activate this license in your self-hosted RabbitHQ deployment:
1. Set the LICENSE_KEY environment variable to the license key above
2. Set LICENSE_VALIDATION_URL to your RabbitHQ backend URL
3. Restart your application

For more information, visit: https://rabbithq.io/docs/standalone
`;

    return c.text(licenseContent, 200, {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="rabbithq-license-${licenseId}.txt"`,
    });
  } catch (error) {
    logger.error({ error }, "Error downloading license");
    return c.json({ error: "Failed to download license" }, 500);
  }
});

export default portalLicenseController;
