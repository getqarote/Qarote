import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UserRole } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authorize, checkWorkspaceAccess } from "@/core/auth";
import { updateWorkspacePrivacySchema } from "@/schemas/workspace";

const privacyRoutes = new Hono();

// Get workspace privacy settings
privacyRoutes.get("/:id/privacy", checkWorkspaceAccess, async (c) => {
  try {
    const id = c.req.param("id");

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        plan: true,
        storageMode: true,
        retentionDays: true,
        encryptData: true,
        autoDelete: true,
        consentGiven: true,
        consentDate: true,
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({ privacy: workspace });
  } catch (error) {
    logger.error(
      `Error fetching privacy settings for workspace ${c.req.param("id")}:`,
      error
    );
    return c.json({ error: "Failed to fetch privacy settings" }, 500);
  }
});

// Update workspace privacy settings (ADMIN ONLY)
privacyRoutes.put(
  "/:id/privacy",
  authorize([UserRole.ADMIN]),
  checkWorkspaceAccess,
  zValidator("json", updateWorkspacePrivacySchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");

      // Verify workspace exists and user has access
      const workspace = await prisma.workspace.findUnique({
        where: { id },
        select: { id: true, plan: true },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Validate storage mode against plan type
      if (
        data.storageMode === "HISTORICAL" &&
        workspace.plan !== "STARTUP" &&
        workspace.plan !== "BUSINESS"
      ) {
        return c.json(
          {
            error: "Historical storage mode requires Startup or Business plan",
          },
          400
        );
      }

      // Update privacy settings
      const updatedWorkspace = await prisma.workspace.update({
        where: { id },
        data: {
          ...data,
          consentDate: data.consentGiven ? new Date() : null,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          plan: true,
          storageMode: true,
          retentionDays: true,
          encryptData: true,
          autoDelete: true,
          consentGiven: true,
          consentDate: true,
        },
      });

      return c.json({ privacy: updatedWorkspace });
    } catch (error) {
      logger.error(
        `Error updating privacy settings for workspace ${c.req.param("id")}:`,
        error
      );
      return c.json({ error: "Failed to update privacy settings" }, 500);
    }
  }
);

export default privacyRoutes;
