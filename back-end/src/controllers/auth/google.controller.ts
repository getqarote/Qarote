import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod/v4";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { setSentryUser } from "@/core/sentry";
import { generateToken, SafeUser } from "@/core/auth";
import { googleConfig } from "@/config";
import { UserRole } from "@prisma/client";
import { notionService } from "@/services/integrations/notion.service";

const googleController = new Hono();

// Initialize Google OAuth client
const client = new OAuth2Client();

// Schema for Google OAuth request
const GoogleAuthSchema = z.object({
  credential: z.string(),
});

// Google OAuth login endpoint
googleController.post(
  "/google",
  zValidator("json", GoogleAuthSchema),
  async (c) => {
    const { credential } = c.req.valid("json");

    try {
      // Verify the Google OAuth token
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleConfig.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return c.json({ error: "Invalid Google token" }, 401);
      }

      const { sub: googleId, email, given_name, family_name } = payload;

      if (!email) {
        return c.json({ error: "Email not provided by Google" }, 400);
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // User exists, check if they have Google OAuth linked
        if (!user.googleId) {
          // Link Google OAuth to existing account
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              emailVerified: true, // Google emails are verified
              emailVerifiedAt: new Date(),
              lastLogin: new Date(),
            },
          });

          // Update user in Notion when email is verified (non-blocking)
          try {
            const notionResult = await notionService.findUserByUserId(user.id);

            if (notionResult.success && notionResult.notionPageId) {
              // Update existing Notion page
              await notionService.updateUser(notionResult.notionPageId, {
                emailVerified: true,
              });
              logger.info(
                { userId: user.id, notionPageId: notionResult.notionPageId },
                "User email verification status updated in Notion (Google OAuth)"
              );
            } else {
              // User doesn't exist in Notion yet, create them
              const createResult = await notionService.createUser({
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                role: user.role,
                workspaceId: user.workspaceId,
              });

              if (createResult.success) {
                logger.info(
                  {
                    userId: user.id,
                    notionPageId: createResult.notionPageId,
                  },
                  "User created in Notion during Google OAuth linking"
                );
              } else {
                logger.warn(
                  { error: createResult.error, userId: user.id },
                  "Failed to create user in Notion during Google OAuth linking"
                );
              }
            }
          } catch (notionError) {
            logger.error(
              { error: notionError, userId: user.id },
              "Failed to sync user to Notion during Google OAuth linking"
            );
            // Don't fail the OAuth flow if Notion sync fails
          }
        } else {
          // Update last login
          user = await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });
        }
      } else {
        // Create new user with Google OAuth
        user = await prisma.user.create({
          data: {
            email,
            firstName: given_name || "",
            lastName: family_name || "",
            googleId,
            emailVerified: true, // Google emails are verified
            emailVerifiedAt: new Date(),
            isActive: true,
            role: UserRole.ADMIN,
            lastLogin: new Date(),
          },
        });

        // Create user in Notion (non-blocking)
        try {
          const notionResult = await notionService.createUser({
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            role: user.role,
            workspaceId: user.workspaceId,
          });

          if (!notionResult.success) {
            logger.warn(
              { error: notionResult.error, userId: user.id },
              "Failed to create user in Notion during Google OAuth registration"
            );
          } else {
            logger.info(
              { userId: user.id, notionPageId: notionResult.notionPageId },
              "User created in Notion during Google OAuth registration"
            );
          }
        } catch (notionError) {
          logger.error(
            { error: notionError, userId: user.id },
            "Failed to create user in Notion during Google OAuth registration"
          );
          // Don't fail the OAuth flow if Notion sync fails
        }
      }

      if (!user.isActive) {
        return c.json({ error: "Account is inactive" }, 403);
      }

      // Generate JWT token
      const token = await generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId || null,
      });

      const safeUser: SafeUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        workspaceId: user.workspaceId || null,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Set Sentry user context
      setSentryUser({
        id: user.id,
        workspaceId: null,
        email: user.email,
      });

      return c.json({ user: safeUser, token });
    } catch (error) {
      logger.error({ error }, "Google OAuth login error");
      return c.json({ error: "Failed to authenticate with Google" }, 500);
    }
  }
);

export default googleController;
