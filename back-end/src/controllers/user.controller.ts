import { Hono } from "hono";
import { z } from "zod/v4";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import { authenticate, authorize } from "@/core/auth";
import { UpdateUserSchema, UpdateProfileSchema } from "@/schemas/user";
import { UserRole } from "@prisma/client";
import { logger } from "@/core/logger";
import { planValidationMiddleware } from "@/middlewares/plan-validation";
import { EmailVerificationService } from "@/services/email/email-verification.service";
import { strictRateLimiter } from "@/middlewares/rateLimiter";
import { UpdateWorkspaceSchema } from "@/schemas/workspace";

const userController = new Hono();

// All routes in this controller require authentication
userController.use("*", authenticate);

// Apply plan validation middleware to all routes
userController.use("*", planValidationMiddleware());

// Get users in the same workspace
userController.get(
  "/workspace/:workspaceId",
  zValidator("param", z.object({ workspaceId: z.string() })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");

    try {
      const users = await prisma.user.findMany({
        where: { workspaceId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return c.json({ users });
    } catch (error) {
      logger.error(
        { error },
        `Error fetching users for workspace ${workspaceId}`
      );
      return c.json({ error: "Failed to fetch users" }, 500);
    }
  }
);

// Get a specific user by ID (admin or same workspace)
userController.get("/:id", async (c) => {
  const id = c.req.param("id");
  const currentUser = c.get("user");

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        workspaceId: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Only allow admins or users from the same workspace to access user details
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.id !== user.id &&
      currentUser.workspaceId !== user.workspaceId
    ) {
      return c.json(
        { error: "Forbidden", message: "Cannot access this user" },
        403
      );
    }

    return c.json({ user });
  } catch (error) {
    logger.error({ error }, `Error fetching user ${id}`);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

// Update a user (admin only)
userController.put(
  "/:id",
  strictRateLimiter,
  authorize([UserRole.ADMIN]),
  zValidator("json", UpdateUserSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");

    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return c.json({ error: "User not found" }, 404);
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          workspaceId: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return c.json({ user });
    } catch (error) {
      logger.error({ error }, `Error updating user ${id}`);
      return c.json({ error: "Failed to update user" }, 500);
    }
  }
);

// Update own profile (any authenticated user)
userController.put(
  "/profile/me",
  strictRateLimiter,
  zValidator("json", UpdateProfileSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user");

    try {
      // Handle email change separately if provided
      if (data.email && data.email !== user.email) {
        // Check if the new email is already in use
        const existingUser = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existingUser) {
          return c.json({ error: "Email already in use" }, 400);
        }

        // Set pending email and generate verification token
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pendingEmail: data.email,
          },
        });

        // Generate and send verification email
        try {
          const verificationToken =
            await EmailVerificationService.generateVerificationToken({
              userId: user.id,
              email: data.email,
              type: "EMAIL_CHANGE",
            });

          const emailResult =
            await EmailVerificationService.sendVerificationEmail(
              data.email,
              verificationToken,
              "EMAIL_CHANGE",
              user.firstName
            );

          if (!emailResult.success) {
            logger.error(
              { error: emailResult.error },
              "Failed to send email change verification"
            );
            return c.json({ error: "Failed to send verification email" }, 500);
          }
        } catch (emailError) {
          logger.error(
            { error: emailError },
            "Failed to send email change verification"
          );
          return c.json({ error: "Failed to send verification email" }, 500);
        }

        // Remove email from the update data since we're handling it separately
        const { email: _, ...updateData } = data;

        // Update other profile fields (excluding email)
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            pendingEmail: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return c.json({
          user: updatedUser,
          message:
            "Profile updated. Please check your new email to verify the change.",
        });
      } else {
        // No email change, update normally
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            pendingEmail: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return c.json({ user: updatedUser });
      }
    } catch (error) {
      logger.error({ error }, `Error updating profile for user ${user.id}`);
      return c.json({ error: "Failed to update profile" }, 500);
    }
  }
);

// Get pending invitations for a workspace
userController.get(
  "/invitations/workspace/:workspaceId",
  authorize([UserRole.ADMIN]),
  zValidator("param", z.object({ workspaceId: z.string() })),
  async (c) => {
    const workspaceId = c.req.param("workspaceId");

    try {
      const invitations = await prisma.invitation.findMany({
        where: {
          workspaceId,
          status: "PENDING",
        },
        include: {
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

      return c.json({ invitations });
    } catch (error) {
      logger.error(
        { error },
        `Error fetching invitations for workspace ${workspaceId}`
      );
      return c.json({ error: "Failed to fetch invitations" }, 500);
    }
  }
);

// Get current user's profile
userController.get("/profile/me", async (c) => {
  const user = c.get("user");

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        googleId: true,
        workspace: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                users: true,
                servers: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    logger.error({ error }, `Error fetching profile for user ${user.id}`);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// Update workspace information (workspace admin only)
userController.put(
  "/profile/workspace",
  authorize([UserRole.ADMIN]),
  zValidator("json", UpdateWorkspaceSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user");

    if (!user.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    try {
      const updatedWorkspace = await prisma.workspace.update({
        where: { id: user.workspaceId },
        data,
        select: {
          id: true,
          name: true,
          contactEmail: true,
          logoUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              servers: true,
            },
          },
        },
      });

      return c.json({ workspace: updatedWorkspace });
    } catch (error) {
      logger.error({ error }, `Error updating workspace ${user.workspaceId}`);
      return c.json({ error: "Failed to update workspace information" }, 500);
    }
  }
);

// Get workspace users
userController.get("/profile/workspace/users", async (c) => {
  const user = c.get("user");

  try {
    const users = await prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ users });
  } catch (error) {
    logger.error(
      { error },
      `Error fetching workspace users for workspace ${user.workspaceId}`
    );
    return c.json({ error: "Failed to fetch workspace users" }, 500);
  }
});

// Remove user from workspace (ADMIN ONLY)
userController.delete(
  "/profile/workspace/users/:userId",
  authorize([UserRole.ADMIN]),
  zValidator("param", z.object({ userId: z.string() })),
  async (c) => {
    const currentUser = c.get("user");
    const userIdToRemove = c.req.param("userId");

    if (!currentUser.workspaceId) {
      return c.json({ error: "No workspace assigned" }, 400);
    }

    try {
      // Find the user to remove
      const userToRemove = await prisma.user.findFirst({
        where: {
          id: userIdToRemove,
          workspaceId: currentUser.workspaceId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (!userToRemove) {
        return c.json({ error: "User not found in this workspace" }, 404);
      }

      // Prevent removing yourself
      if (userToRemove.id === currentUser.id) {
        return c.json(
          { error: "Cannot remove yourself from the workspace" },
          400
        );
      }

      // Prevent removing other admins (only workspace owner can remove admins)
      if (userToRemove.role === UserRole.ADMIN) {
        // Check if current user is the workspace owner
        const workspace = await prisma.workspace.findFirst({
          where: {
            id: currentUser.workspaceId,
            ownerId: currentUser.id,
          },
        });

        if (!workspace) {
          return c.json(
            {
              error: "Only workspace owners can remove admin users",
            },
            403
          );
        }
      }

      // Remove user from workspace by setting workspaceId to null
      await prisma.user.update({
        where: { id: userIdToRemove },
        data: {
          workspaceId: null,
          role: UserRole.USER, // Reset role to USER when removed from workspace
        },
      });

      logger.info(
        {
          removedUserId: userIdToRemove,
          removedUserEmail: userToRemove.email,
          removedByUserId: currentUser.id,
          removedByUserEmail: currentUser.email,
          workspaceId: currentUser.workspaceId,
        },
        "User removed from workspace"
      );

      return c.json({
        message: "User removed from workspace successfully",
        removedUser: {
          id: userToRemove.id,
          email: userToRemove.email,
          name: `${userToRemove.firstName} ${userToRemove.lastName}`,
        },
      });
    } catch (error) {
      logger.error(
        { error, userIdToRemove, currentUserId: currentUser.id },
        "Error removing user from workspace"
      );
      return c.json({ error: "Failed to remove user from workspace" }, 500);
    }
  }
);

export default userController;
