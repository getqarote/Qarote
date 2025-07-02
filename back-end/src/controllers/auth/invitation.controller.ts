import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { InvitationStatus } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { hashPassword, generateToken, SafeUser } from "@/core/auth";
import { AcceptInvitationSchema } from "@/schemas/auth";
import { EmailService } from "@/services/email/email.service";

const app = new Hono();

// Accept invitation
app.post("/accept", zValidator("json", AcceptInvitationSchema), async (c) => {
  const { token, password, firstName, lastName } = c.req.valid("json");

  try {
    // Find invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      return c.json({ error: "Invalid invitation token" }, 400);
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return c.json(
        { error: "Invitation has already been used or expired" },
        400
      );
    }

    const now = new Date();
    if (invitation.expiresAt < now) {
      // Update invitation status to expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      return c.json({ error: "Invitation has expired" }, 400);
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    const isNewUser = !user; // Track if this is a new user

    // Transaction to handle user creation/update and invitation acceptance
    const result = await prisma.$transaction(async (tx) => {
      if (user) {
        // Update existing user's workspace
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            workspaceId: invitation.workspaceId,
            role: invitation.role,
          },
        });
      } else {
        // Create new user
        if (!password || !firstName || !lastName) {
          throw new Error(
            "Password, first name, and last name are required for new users"
          );
        }

        const hashedPassword = await hashPassword(password);
        user = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
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

    // Send welcome email for newly created users
    if (isNewUser) {
      try {
        await EmailService.sendWelcomeEmail({
          to: result.email,
          name: result.firstName || result.email,
          workspaceName: invitation.workspace.name,
          plan: invitation.workspace.plan,
        });
      } catch (emailError) {
        logger.error(
          { error: emailError },
          "Failed to send welcome email during invitation acceptance"
        );
        // Don't fail the invitation acceptance if email fails
      }
    }

    const safeUser: SafeUser = {
      id: result.id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      role: result.role,
      workspaceId: result.workspaceId,
      isActive: result.isActive,
      emailVerified: result.emailVerified,
      lastLogin: result.lastLogin,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    return c.json({
      user: safeUser,
      token: authToken,
      workspace: invitation.workspace,
    });
  } catch (error) {
    logger.error({ error }, "Accept invitation error");
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: "Failed to accept invitation" }, 500);
  }
});

export default app;
