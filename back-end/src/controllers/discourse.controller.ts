/**
 * Discourse SSO Controller for RabbitHQ Backend
 * Handles SSO authentication between RabbitHQ and Discourse
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { DiscourseSSO } from "@/services/discourse-sso.service";
import { discourseConfig } from "@/config";
import { logger } from "@/core/logger";
import { authenticate, SafeUser } from "@/core/auth";
import {
  DiscourseSSOCallbackSchema,
  DiscourseEmbedSchema,
} from "@/schemas/discourse";

const discourseSSO = new DiscourseSSO(
  discourseConfig.ssoSecret,
  discourseConfig.url
);

const discourseController = new Hono();

/**
 * Generate SSO URL for user to access Discourse
 * POST /api/discourse/sso
 */
// discourseController.post(
//   "/sso",
//   zValidator("json", DiscourseSSOUserSchema),
//   async (c) => {
//     try {
//       const userData = c.req.valid("json");

//       const user: DiscourseUser = {
//         id: userData.id,
//         email: userData.email,
//         name: userData.name,
//         username: userData.username,
//         avatar_url: userData.avatar_url,
//       };

//       // Generate SSO URL
//       const ssoUrl = discourseSSO.generateSSOUrl(user);

//       return c.json({ ssoUrl });
//     } catch (error) {
//       logger.error({ error }, "Error generating SSO URL");
//       return c.json({ error: "Failed to generate SSO URL" }, 500);
//     }
//   }
// );

/**
 * Handle SSO callback from Discourse (DiscourseConnect protocol)
 * GET /api/discourse/callback
 */
discourseController.get(
  "/callback",
  authenticate,
  zValidator("query", DiscourseSSOCallbackSchema),
  async (c) => {
    try {
      const { sso, sig } = c.req.valid("query");

      // Verify SSO callback from Discourse
      const payload = discourseSSO.verifySSOCallback(sso, sig);

      if (!payload) {
        logger.error({ sso, sig }, "Invalid SSO callback signature");
        return c.json({ error: "Invalid SSO callback" }, 400);
      }

      logger.info({ payload }, "Received valid SSO callback from Discourse");

      // Get authenticated user (middleware ensures this exists)
      const user = c.get("user") as SafeUser;

      // Create response payload for Discourse
      const responsePayload = {
        nonce: payload.nonce, // Must match the nonce from Discourse
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        username: user.email.split("@")[0],
        external_id: user.id,
        // Optional fields
        avatar_url: undefined, // SafeUser doesn't have avatarUrl
        admin: false, // You can determine this based on user role
        moderator: false, // You can determine this based on user role
      };

      // Generate response URL for Discourse
      const responseUrl = discourseSSO.generateResponseUrl(responsePayload);

      logger.info(
        {
          userId: user.id,
          userEmail: user.email,
          responseUrl: responseUrl.substring(0, 100) + "...",
        },
        "Redirecting user back to Discourse with SSO response"
      );

      // Return the redirect URL for the frontend to handle
      return c.json({ redirectUrl: responseUrl });
    } catch (error) {
      logger.error({ error }, "Error processing SSO callback");
      return c.text("Internal server error", 500);
    }
  }
);

/**
 * Get Discourse embed configuration
 * GET /api/discourse/embed
 */
discourseController.get(
  "/embed",
  zValidator("query", DiscourseEmbedSchema),
  async (c) => {
    try {
      const { topic, category } = c.req.valid("query");

      const embedUrl = discourseSSO.getEmbedUrl(
        topic || undefined,
        category || undefined
      );

      return c.json({ embedUrl });
    } catch (error) {
      logger.error({ error }, "Error getting embed URL");
      return c.json({ error: "Failed to get embed URL" }, 500);
    }
  }
);

/**
 * Get Discourse API information
 * GET /api/discourse/info
 */
discourseController.get("/info", async (c) => {
  try {
    return c.json({
      discourseUrl: discourseConfig.url,
      ssoEnabled: !!discourseConfig.ssoSecret,
      embedEnabled: true,
    });
  } catch (error) {
    logger.error({ error }, "Error getting Discourse info");
    return c.json({ error: "Failed to get Discourse info" }, 500);
  }
});

/**
 * Get community statistics
 * GET /api/discourse/stats
 */
discourseController.get("/stats", async (c) => {
  try {
    // For now, return mock data since we don't have direct Discourse API access
    // In production, you would call Discourse's API endpoints
    return c.json({
      topics: 0,
      posts: 0,
      users: 0,
      categories: 0,
    });
  } catch (error) {
    logger.error({ error }, "Error getting community stats");
    return c.json({ error: "Failed to get community stats" }, 500);
  }
});

/**
 * Get recent topics
 * GET /api/discourse/topics
 */
discourseController.get("/topics", async (c) => {
  try {
    const _limit = parseInt(c.req.query("limit") || "5");

    // For now, return mock data since we don't have direct Discourse API access
    // In production, you would call Discourse's API endpoints
    return c.json({
      topics: [],
    });
  } catch (error) {
    logger.error({ error }, "Error getting recent topics");
    return c.json({ error: "Failed to get recent topics" }, 500);
  }
});

/**
 * Check authentication status
 * GET /api/discourse/auth-check
 */
discourseController.get("/auth-check", async (c) => {
  try {
    // For now, return false since we don't have user session management
    // In production, you would check if the user is authenticated
    return c.json({ authenticated: false });
  } catch (error) {
    logger.error({ error }, "Error checking auth status");
    return c.json({ error: "Failed to check auth status" }, 500);
  }
});

export default discourseController;
