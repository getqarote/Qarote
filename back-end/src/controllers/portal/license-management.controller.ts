/**
 * Portal License Management Controller
 * Handles license management endpoints for Customer Portal
 */

import { Hono } from "hono";

import { authenticate } from "@/core/auth";
import { logger } from "@/core/logger";

import { licenseService } from "@/services/license/license.service";

const licenseManagementController = new Hono();

// Apply authentication to all routes
licenseManagementController.use("*", authenticate);

// Get all licenses for the authenticated user
licenseManagementController.get("/", async (c) => {
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

// Download license file
licenseManagementController.get("/:id/download", async (c) => {
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

export default licenseManagementController;
