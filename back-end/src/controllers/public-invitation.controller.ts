import { zValidator } from "@hono/zod-validator";
import { InvitationStatus } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { Hono } from "hono";
import { z } from "zod/v4";

import { generateToken, hashPassword } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { AcceptInvitationWithRegistrationSchema } from "@/schemas/auth";

import { googleConfig } from "@/config";

import { getUserDisplayName } from "./shared";

const publicInvitationController = new Hono();

// Initialize Google OAuth client
const client = new OAuth2Client();

// Schema for Google OAuth invitation acceptance
const GoogleInvitationAcceptSchema = z.object({
  credential: z.string(),
});

/**
 * GET /invitations/:token - Get invitation details for registration (PUBLIC)
 */
publicInvitationController.get("/:token", async (c) => {
  try {
    const token = c.req.param("token");

    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: InvitationStatus.PENDING,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            ownerId: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      return c.json({ error: "Invalid or expired invitation" }, 404);
    }

    // Get workspace owner's subscription to determine plan
    const ownerSubscription = await prisma.subscription.findUnique({
      where: { userId: invitation.workspace.ownerId! },
      select: { plan: true },
    });

    if (!ownerSubscription) {
      return c.json(
        { error: "Workspace owner has no active subscription" },
        400
      );
    }

    return c.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          contactEmail: invitation.workspace.contactEmail,
          plan: ownerSubscription.plan,
        },
        invitedBy: {
          id: invitation.invitedBy.id,
          email: invitation.invitedBy.email,
          displayName: getUserDisplayName(invitation.invitedBy),
        },
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching invitation details");
    return c.json({ error: "Failed to fetch invitation details" }, 500);
  }
});

/**
 * POST /invitations/:token/accept - Accept an invitation (PUBLIC)
 */
publicInvitationController.post(
  "/:token/accept",
  zValidator("json", AcceptInvitationWithRegistrationSchema),
  async (c) => {
    try {
      const token = c.req.param("token");
      const { password, firstName, lastName } = c.req.valid("json");

      const invitation = await prisma.invitation.findFirst({
        where: {
          token,
          status: InvitationStatus.PENDING,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!invitation) {
        return c.json({ error: "Invalid or expired invitation" }, 404);
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) {
        return c.json({ error: "User with this email already exists" }, 409);
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await prisma.user.create({
        data: {
          email: invitation.email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          role: invitation.role,
          workspaceId: invitation.workspaceId,
          isActive: true,
          emailVerified: true, // Auto-verify since they came from invitation
        },
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      const jwtToken = generateToken(newUser);

      return c.json({
        message: "Invitation accepted successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          workspaceId: newUser.workspaceId,
        },
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
        },
        token: jwtToken,
      });
    } catch (error) {
      logger.error({ error }, "Error accepting invitation");
      return c.json({ error: "Failed to accept invitation" }, 500);
    }
  }
);

/**
 * POST /invitations/:token/accept-google - Accept an invitation with Google OAuth (PUBLIC)
 */
publicInvitationController.post(
  "/:token/accept-google",
  zValidator("json", GoogleInvitationAcceptSchema),
  async (c) => {
    try {
      const token = c.req.param("token");
      const { credential } = c.req.valid("json");

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

      // Find the invitation
      const invitation = await prisma.invitation.findFirst({
        where: {
          token,
          status: InvitationStatus.PENDING,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!invitation) {
        return c.json({ error: "Invalid or expired invitation" }, 404);
      }

      // Verify that the Google email matches the invitation email
      if (email.toLowerCase() !== invitation.email.toLowerCase()) {
        return c.json(
          { error: "Google account email does not match invitation email" },
          400
        );
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: invitation.email },
      });

      const isNewUser = !user;

      // Transaction to handle user creation/update and invitation acceptance
      const result = await prisma.$transaction(async (tx) => {
        if (user) {
          // Update existing user's workspace and link Google OAuth
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              workspaceId: invitation.workspaceId,
              role: invitation.role,
              googleId,
              emailVerified: true, // Google emails are verified
              emailVerifiedAt: new Date(),
              lastLogin: new Date(),
            },
          });
        } else {
          // Create new user with Google OAuth
          user = await tx.user.create({
            data: {
              email: invitation.email,
              firstName: given_name || "",
              lastName: family_name || "",
              googleId,
              workspaceId: invitation.workspaceId,
              role: invitation.role,
              emailVerified: true, // Google emails are verified
              emailVerifiedAt: new Date(),
              isActive: true,
              lastLogin: new Date(),
            },
          });
        }

        // Update invitation status
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.ACCEPTED,
            invitedUserId: user.id,
          },
        });

        return user;
      });

      // Generate JWT token
      const authToken = await generateToken({
        id: result.id,
        email: result.email,
        role: result.role,
        workspaceId: result.workspaceId,
      });

      return c.json({
        message: "Invitation accepted successfully with Google",
        user: {
          id: result.id,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          role: result.role,
          workspaceId: result.workspaceId,
          googleId: result.googleId,
          emailVerified: result.emailVerified,
        },
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
        },
        token: authToken,
        isNewUser,
      });
    } catch (error) {
      logger.error({ error }, "Error accepting invitation with Google");
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to accept invitation with Google" }, 500);
    }
  }
);

export default publicInvitationController;
