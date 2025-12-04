/**
 * Discord Controller for RabbitHQ Backend
 * Handles Discord community integration
 */

import { Hono } from "hono";

import { authenticate, SafeUser } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

const discordController = new Hono();

/**
 * Mark user as having joined Discord
 * POST /api/discord/join
 */
discordController.post("/join", authenticate, async (c) => {
  try {
    const user = c.get("user") as SafeUser;

    // Update user's Discord status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        discordJoined: true,
        discordJoinedAt: new Date(),
      },
      select: {
        id: true,
        discordJoined: true,
        discordJoinedAt: true,
      },
    });

    logger.info(
      { userId: user.id, email: user.email },
      "User marked as joined Discord"
    );

    return c.json({
      success: true,
      discordJoined: updatedUser.discordJoined,
      discordJoinedAt: updatedUser.discordJoinedAt,
    });
  } catch (error) {
    logger.error({ error }, "Error marking user as joined Discord");
    return c.json({ error: "Failed to update Discord status" }, 500);
  }
});

/**
 * Get user's Discord join status
 * GET /api/discord/status
 */
discordController.get("/status", authenticate, async (c) => {
  try {
    const user = c.get("user") as SafeUser;

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        discordJoined: true,
        discordJoinedAt: true,
      },
    });

    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      discordJoined: userData.discordJoined,
      discordJoinedAt: userData.discordJoinedAt,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching Discord status");
    return c.json({ error: "Failed to fetch Discord status" }, 500);
  }
});

export default discordController;
