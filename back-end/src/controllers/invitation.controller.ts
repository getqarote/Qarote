import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import { authenticate, authorize } from "@/core/auth";
import { logger } from "@/core/logger";
import { UserRole } from "@prisma/client";
import { EmailService } from "@/services/email/email.service";
import {
  validateUserInvitation,
  calculateMonthlyCostForUsers,
  getUserLimitText,
  getInvitationLimitText,
  PlanValidationError,
} from "@/services/plan/plan.service";
import { EncryptionService } from "@/services/encryption.service";
import { inviteUserSchema } from "@/schemas/invitation";
import { getUserDisplayName } from "./shared";

const invitationController = new Hono();

/**
 * GET /invitations - Get all pending invitations for workspace (requires auth)
 */
invitationController.get("/", authenticate, async (c) => {
  try {
    const user = c.get("user");
    if (!user.workspaceId) {
      return c.json(
        { error: "User not authenticated or not in workspace" },
        401
      );
    }

    // Get all pending invitations for the workspace
    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId: user.workspaceId,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Add display names to results
    const invitationsWithNames = invitations.map((invitation) => ({
      ...invitation,
      invitedBy: {
        ...invitation.invitedBy,
        displayName: getUserDisplayName(invitation.invitedBy),
      },
    }));

    return c.json({
      success: true,
      invitations: invitationsWithNames,
      count: invitations.length,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching invitations");
    return c.json({ error: "Failed to fetch invitations" }, 500);
  }
});

/**
 * POST /invitations - Send a user invitation (requires auth) (ADMIN ONLY)
 */
invitationController.post(
  "/",
  authorize([UserRole.ADMIN]),
  zValidator("json", inviteUserSchema),
  async (c) => {
    try {
      const user = c.get("user");
      if (!user.workspaceId) {
        return c.json(
          { error: "User not authenticated or not in workspace" },
          401
        );
      }

      const { email, role } = c.req.valid("json");

      // Get workspace with plan information from owner's subscription
      const workspace = await prisma.workspace.findUnique({
        where: { id: user.workspaceId },
        select: {
          id: true,
          name: true,
          ownerId: true,
          users: {
            select: { id: true },
          },
        },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Get workspace owner's subscription to determine plan
      const ownerSubscription = await prisma.subscription.findUnique({
        where: { userId: workspace.ownerId! },
        select: { plan: true },
      });

      const plan = ownerSubscription?.plan || "FREE";

      // Count pending invitations
      const pendingInvitations = await prisma.invitation.count({
        where: {
          workspaceId: workspace.id,
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      // Validate invitation limits
      try {
        validateUserInvitation(
          plan,
          workspace.users.length,
          pendingInvitations
        );
      } catch (validationError) {
        const error = validationError as PlanValidationError;
        return c.json(
          {
            error: error.message,
            planLimits: {
              userLimit: getUserLimitText(plan),
              invitationLimit: getInvitationLimitText(plan),
              currentUsers: workspace.users.length,
              pendingInvitations,
            },
          },
          403
        );
      }

      // Check if user is already in workspace or already invited
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          workspaceId: workspace.id,
        },
      });

      if (existingUser) {
        return c.json(
          { error: "User is already a member of this workspace" },
          400
        );
      }

      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email,
          workspaceId: workspace.id,
          status: "PENDING",
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (existingInvitation) {
        return c.json({ error: "User already has a pending invitation" }, 400);
      }

      // Generate invitation token
      const invitationToken = EncryptionService.generateEncryptionKey();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // Create invitation record
      const invitation = await prisma.invitation.create({
        data: {
          email,
          role,
          token: invitationToken,
          workspaceId: workspace.id,
          invitedById: user.id,
          expiresAt,
          status: "PENDING",
        },
      });

      // Send invitation email
      const emailResult = await EmailService.sendInvitationEmail({
        to: email,
        inviterName: getUserDisplayName(user),
        inviterEmail: user.email,
        workspaceName: workspace.name,
        invitationToken,
        plan: plan,
      });

      if (!emailResult.success) {
        // If email fails, delete the invitation record
        await prisma.invitation.delete({
          where: { id: invitation.id },
        });

        return c.json(
          {
            error: "Failed to send invitation email",
            details: emailResult.error,
          },
          500
        );
      }

      // Calculate cost information
      const monthlyCost = calculateMonthlyCostForUsers(plan, 1);

      return c.json({
        success: true,
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          monthlyCost,
        },
        emailResult: {
          messageId: emailResult.messageId,
        },
      });
    } catch (error) {
      logger.error({ error }, "Error sending invitation");
      return c.json({ error: "Failed to send invitation" }, 500);
    }
  }
);

/**
 * DELETE /invitations/:id - Cancel/revoke an invitation (ADMIN ONLY)
 */
invitationController.delete(
  "/:id",
  authenticate,
  authorize([UserRole.ADMIN]),
  async (c) => {
    try {
      const user = c.get("user");
      if (!user.workspaceId) {
        return c.json(
          { error: "User not authenticated or not in workspace" },
          401
        );
      }

      const invitationId = c.req.param("id");

      // Find the invitation
      const invitation = await prisma.invitation.findFirst({
        where: {
          id: invitationId,
          workspaceId: user.workspaceId,
          status: "PENDING",
        },
      });

      if (!invitation) {
        return c.json(
          { error: "Invitation not found or already processed" },
          404
        );
      }

      // Update invitation status to expired
      await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          status: "EXPIRED",
          updatedAt: new Date(),
        },
      });

      return c.json({
        success: true,
        message: "Invitation revoked successfully",
      });
    } catch (error) {
      logger.error({ error }, "Error revoking invitation");
      return c.json({ error: "Failed to revoke invitation" }, 500);
    }
  }
);

/**
 * POST /invitations/:token/accept - Accept an invitation
 */
invitationController.post("/:token/accept", async (c) => {
  try {
    const token = c.req.param("token");

    // Find the invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        workspace: true,
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return c.json({ error: "Invalid or expired invitation token" }, 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      if (existingUser.workspaceId === invitation.workspaceId) {
        // User is already in this workspace
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            invitedUserId: existingUser.id,
            updatedAt: new Date(),
          },
        });

        return c.json({
          success: true,
          message: "You are already a member of this workspace",
          user: {
            id: existingUser.id,
            email: existingUser.email,
            displayName: getUserDisplayName(existingUser),
          },
        });
      } else {
        // User exists but in different workspace - move to new workspace
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            workspaceId: invitation.workspaceId,
            role: invitation.role,
            updatedAt: new Date(),
          },
        });

        await prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            invitedUserId: existingUser.id,
            updatedAt: new Date(),
          },
        });

        return c.json({
          success: true,
          message: "Invitation accepted successfully",
          user: {
            id: existingUser.id,
            email: existingUser.email,
            displayName: getUserDisplayName(existingUser),
          },
          workspace: {
            id: invitation.workspace.id,
            name: invitation.workspace.name,
          },
        });
      }
    }

    // User doesn't exist - they need to complete registration
    return c.json({
      success: false,
      requiresRegistration: true,
      message: "Please complete your account registration",
      invitation: {
        token: invitation.token,
        email: invitation.email,
        role: invitation.role,
        workspaceName: invitation.workspace.name,
        inviterName: getUserDisplayName(invitation.invitedBy),
      },
    });
  } catch (error) {
    logger.error({ error }, "Error accepting invitation");
    return c.json({ error: "Failed to accept invitation" }, 500);
  }
});

/**
 * GET /invitations/:token - Get invitation details for registration
 */
invitationController.get("/:token", async (c) => {
  try {
    const token = c.req.param("token");

    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return c.json({ error: "Invalid or expired invitation token" }, 400);
    }

    // Get workspace owner's subscription to determine plan
    const ownerSubscription = await prisma.subscription.findUnique({
      where: { userId: invitation.workspace.ownerId! },
      select: { plan: true },
    });

    const plan = ownerSubscription?.plan || "FREE";

    return c.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          plan: plan,
        },
        inviter: {
          ...invitation.invitedBy,
          displayName: getUserDisplayName(invitation.invitedBy),
        },
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching invitation details");
    return c.json({ error: "Failed to fetch invitation details" }, 500);
  }
});

export default invitationController;
