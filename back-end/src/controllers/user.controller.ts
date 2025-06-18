import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import prisma from "../core/prisma";
import { hashPassword, authenticate, authorize, SafeUser } from "../core/auth";
import { UpdateUserSchema, UpdateProfileSchema } from "../schemas/user";
import { UpdateWorkspaceSchema } from "../schemas/workspace";
import { InviteUserSchema } from "../schemas/auth";
import { generateRandomToken } from "../core/auth";
import { UserRole } from "@prisma/client";
import { validateUserInvitation } from "../services/plan-validation.service";
import {
  getWorkspacePlan,
  getWorkspaceResourceCounts,
  planValidationMiddleware,
} from "../middlewares/plan-validation";

const userController = new Hono();

// All routes in this controller require authentication
userController.use("*", authenticate);

// Apply plan validation middleware to all routes
userController.use("*", planValidationMiddleware());

// Get all users (admin only)
userController.get("/", authorize([UserRole.ADMIN]), async (c) => {
  try {
    const users = await prisma.user.findMany({
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

    return c.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Get users in the same workspace (admin or workspace admin)
userController.get("/workspace/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user") as SafeUser;

  // Check if user has access to this workspace
  if (user.role !== UserRole.ADMIN && user.workspaceId !== workspaceId) {
    return c.json(
      { error: "Forbidden", message: "Cannot access users for this workspace" },
      403
    );
  }

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
    console.error(`Error fetching users for workspace ${workspaceId}:`, error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

// Get a specific user by ID (admin or same workspace)
userController.get("/:id", async (c) => {
  const id = c.req.param("id");
  const currentUser = c.get("user") as SafeUser;

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
    console.error(`Error fetching user ${id}:`, error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});

// Update a user (admin only)
userController.put(
  "/:id",
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
      console.error(`Error updating user ${id}:`, error);
      return c.json({ error: "Failed to update user" }, 500);
    }
  }
);

// Update own profile (any authenticated user)
userController.put(
  "/profile/me",
  zValidator("json", UpdateProfileSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user") as SafeUser;

    try {
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
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return c.json({ user: updatedUser });
    } catch (error) {
      console.error(`Error updating profile for user ${user.id}:`, error);
      return c.json({ error: "Failed to update profile" }, 500);
    }
  }
);

// Invite a user to a workspace (admin or workspace admin)
userController.post(
  "/invite",
  zValidator("json", InviteUserSchema),
  async (c) => {
    const { email, role, workspaceId } = c.req.valid("json");
    const currentUser = c.get("user") as SafeUser;

    // Check if user has access to this workspace
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.workspaceId !== workspaceId
    ) {
      return c.json(
        {
          error: "Forbidden",
          message: "Cannot invite users to this workspace",
        },
        403
      );
    }

    try {
      // Validate plan restrictions for user invitation
      const [plan, resourceCounts] = await Promise.all([
        getWorkspacePlan(workspaceId),
        getWorkspaceResourceCounts(workspaceId),
      ]);

      validateUserInvitation(plan, resourceCounts.users);

      // Check if workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      // Check if there's already a pending invitation
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          email,
          workspaceId,
          status: "PENDING",
        },
      });

      if (existingInvitation) {
        return c.json(
          { error: "There is already a pending invitation for this email" },
          400
        );
      }

      // Generate invitation token and set expiration (7 days)
      const token = generateRandomToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation
      const invitation = await prisma.invitation.create({
        data: {
          email,
          token,
          workspaceId,
          invitedById: currentUser.id,
          role,
          expiresAt,
          invitedUserId: existingUser?.id,
        },
        include: {
          workspace: {
            select: {
              name: true,
            },
          },
          invitedBy: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // In a real application, you would send an email with the invitation link
      // For this example, we'll just return the token

      return c.json(
        {
          message: `Invitation sent to ${email}`,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            workspaceName: invitation.workspace.name,
            invitedBy: invitation.invitedBy.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            // Only return token in development for testing
            ...(process.env.NODE_ENV === "development"
              ? { token: invitation.token }
              : {}),
          },
        },
        201
      );
    } catch (error) {
      console.error("Error inviting user:", error);
      return c.json({ error: "Failed to invite user" }, 500);
    }
  }
);

// Get pending invitations for a workspace (admin or workspace admin)
userController.get("/invitations/workspace/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const user = c.get("user") as SafeUser;

  // Check if user has access to this workspace
  if (user.role !== UserRole.ADMIN && user.workspaceId !== workspaceId) {
    return c.json(
      {
        error: "Forbidden",
        message: "Cannot access invitations for this workspace",
      },
      403
    );
  }

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
    console.error(
      `Error fetching invitations for workspace ${workspaceId}:`,
      error
    );
    return c.json({ error: "Failed to fetch invitations" }, 500);
  }
});

// Get current user's profile
userController.get("/profile/me", async (c) => {
  const user = c.get("user") as SafeUser;

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
        workspace: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
            plan: true,
            storageMode: true,
            retentionDays: true,
            encryptData: true,
            autoDelete: true,
            consentGiven: true,
            consentDate: true,
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
    console.error(`Error fetching profile for user ${user.id}:`, error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

// Update workspace information (workspace admin only)
userController.put(
  "/profile/workspace",
  zValidator("json", UpdateWorkspaceSchema),
  async (c) => {
    const data = c.req.valid("json");
    const user = c.get("user") as SafeUser;

    if (!user.workspaceId) {
      return c.json(
        { error: "You are not associated with any workspace" },
        404
      );
    }

    // Only admin users can update workspace info
    if (user.role !== UserRole.ADMIN) {
      return c.json(
        { error: "Only admin users can update workspace information" },
        403
      );
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
          plan: true,
          storageMode: true,
          retentionDays: true,
          encryptData: true,
          autoDelete: true,
          consentGiven: true,
          consentDate: true,
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
      console.error(`Error updating workspace ${user.workspaceId}:`, error);
      return c.json({ error: "Failed to update workspace information" }, 500);
    }
  }
);

// Get workspace users (admin only)
userController.get("/profile/workspace/users", async (c) => {
  const user = c.get("user") as SafeUser;

  if (!user.workspaceId) {
    return c.json({ error: "You are not associated with any workspace" }, 404);
  }

  // Only admin users can view workspace users
  if (user.role !== UserRole.ADMIN) {
    return c.json({ error: "Only admin users can view workspace users" }, 403);
  }

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
    console.error(
      `Error fetching workspace users for workspace ${user.workspaceId}:`,
      error
    );
    return c.json({ error: "Failed to fetch workspace users" }, 500);
  }
});

export default userController;
