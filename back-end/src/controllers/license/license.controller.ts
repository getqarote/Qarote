/**
 * License Controller
 * Handles license validation endpoints (called by self-hosted instances)
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod/v4";

import { logger } from "@/core/logger";

import { licenseService } from "@/services/license/license.service";

const licenseController = new Hono();

// Schema for license validation
const ValidateLicenseSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
  instanceId: z.string().optional(),
});

// License validation endpoint (called by self-hosted instances)
licenseController.post(
  "/validate",
  zValidator("json", ValidateLicenseSchema),
  async (c) => {
    const { licenseKey, instanceId } = c.req.valid("json");

    try {
      const validation = await licenseService.validateLicense({
        licenseKey,
        instanceId,
      });

      if (!validation.valid) {
        return c.json(
          {
            valid: false,
            message: validation.message || "License validation failed",
          },
          403
        );
      }

      return c.json({
        valid: true,
        license: validation.license,
      });
    } catch (error) {
      logger.error({ error }, "License validation error");
      return c.json(
        {
          valid: false,
          message: "License validation failed",
        },
        500
      );
    }
  }
);

export default licenseController;
