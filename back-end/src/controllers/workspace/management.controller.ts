import { Hono } from "hono";
import { UserRole, UserPlan } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import {
  validateWorkspaceCreation,
  canUserAddWorkspaceWithCount,
  getPlanFeatures,
  PlanLimitExceededError,
} from "@/services/plan/plan.service";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const workspaceManagementRoutes = new Hono();

// Validation schemas
const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name must be less than 50 characters"),
  contactEmail: z.string().email("Invalid email address").optional(),
  tags: z
    .array(z.string().min(1).max(20))
    .max(10, "Maximum 10 tags allowed")
    .optional(),
});

const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name must be less than 50 characters")
    .optional(),
  contactEmail: z.string().email("Invalid email address").optional(),
  tags: z
    .array(z.string().min(1).max(20))
    .max(10, "Maximum 10 tags allowed")
    .optional(),
});

// Get user's workspaces (owned and member workspaces)
workspaceManagementRoutes.get("/workspaces", async (c) => {
  const user = c.get("user");

  try {
    // Get workspaces owned by the user
    const ownedWorkspaces = await prisma.workspace.findMany({
      where: { ownerId: user.id },
      include: {
        _count: {
          select: {
            users: true,
            servers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get workspaces where user is a member (through invitations)
    const memberWorkspaces = await prisma.workspace.findMany({
      where: {
        AND: [
          { ownerId: { not: user.id } },
          {
            users: {
              some: {
                id: user.id,
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            users: true,
            servers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the response
    const workspaces = [
      ...ownedWorkspaces.map((workspace) => ({
        ...workspace,
        isOwner: true,
        userRole: UserRole.ADMIN, // Owner has admin role
      })),
      ...memberWorkspaces.map((workspace) => ({
        ...workspace,
        isOwner: false,
        userRole: user.role, // Use user's role in the workspace
      })),
    ];

    return c.json({ workspaces });
  } catch (error) {
    logger.error("Error fetching user workspaces:", error);
    return c.json({ error: "Failed to fetch workspaces" }, 500);
  }
});

// Get workspace creation info for current user
workspaceManagementRoutes.get("/workspaces/creation-info", async (c) => {
  const user = c.get("user");

  try {
    // For new users creating their first workspace, they won't have a workspaceId yet
    let currentPlan: UserPlan = UserPlan.FREE; // Default plan for new users

    // Plans are now user-level, get from user's subscription
    if (user.subscription) {
      currentPlan = user.subscription.plan;
    }

    // Count owned workspaces
    const ownedWorkspaceCount = await prisma.workspace.count({
      where: { ownerId: user.id },
    });

    const planFeatures = getPlanFeatures(currentPlan);
    const canCreateWorkspace = canUserAddWorkspaceWithCount(
      currentPlan,
      ownedWorkspaceCount
    );

    return c.json({
      currentPlan: currentPlan,
      ownedWorkspaceCount,
      maxWorkspaces: planFeatures.maxWorkspaces,
      canCreateWorkspace,
      planFeatures: {
        displayName: planFeatures.displayName,
        description: planFeatures.description,
        maxWorkspaces: planFeatures.maxWorkspaces,
      },
    });
  } catch (error) {
    logger.error("Error fetching workspace creation info:", error);
    return c.json({ error: "Failed to fetch workspace creation info" }, 500);
  }
});

// Create a new workspace
workspaceManagementRoutes.post(
  "/workspaces",
  zValidator("json", createWorkspaceSchema),
  async (c) => {
    const user = c.get("user");
    const { name, contactEmail, tags } = c.req.valid("json");

    try {
      // Get user's current plan from their subscription
      let currentPlan: UserPlan = UserPlan.FREE; // Default plan for new users

      const userWithSubscription = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          subscription: {
            select: { plan: true },
          },
        },
      });

      if (userWithSubscription?.subscription) {
        currentPlan = userWithSubscription.subscription.plan;
      }

      // Count current owned workspaces
      const ownedWorkspaceCount = await prisma.workspace.count({
        where: { ownerId: user.id },
      });

      // Validate workspace creation against plan limits
      try {
        validateWorkspaceCreation(currentPlan, ownedWorkspaceCount);
      } catch (error) {
        if (error instanceof PlanLimitExceededError) {
          return c.json(
            {
              error: "Workspace limit exceeded",
              message: error.message,
              currentCount: ownedWorkspaceCount,
              limit: getPlanFeatures(currentPlan).maxWorkspaces,
              currentPlan: currentPlan,
            },
            403
          );
        }
        throw error;
      }

      // Check if workspace name already exists for this user
      const existingWorkspace = await prisma.workspace.findFirst({
        where: {
          ownerId: user.id,
          name: name,
        },
      });

      if (existingWorkspace) {
        return c.json(
          { error: "A workspace with this name already exists" },
          409
        );
      }

      // Create the new workspace and assign user to it
      const newWorkspace = await prisma.$transaction(async (tx) => {
        // Create the workspace
        const workspace = await tx.workspace.create({
          data: {
            name,
            contactEmail,
            tags: tags ? tags : undefined, // Store tags as JSON array or undefined
            ownerId: user.id,
            // Plan is now user-level, not workspace-level
          },
          include: {
            _count: {
              select: {
                users: true,
                servers: true,
              },
            },
          },
        });

        // If this is the user's first workspace (they don't have a workspaceId), assign them to it
        if (!user.workspaceId) {
          await tx.user.update({
            where: { id: user.id },
            data: {
              workspaceId: workspace.id,
              role: UserRole.ADMIN, // Owner becomes admin of their workspace
            },
          });
        }

        return workspace;
      });

      logger.info("Workspace created successfully", {
        workspaceId: newWorkspace.id,
        userId: user.id,
        workspaceName: name,
      });

      return c.json(
        {
          workspace: {
            ...newWorkspace,
            isOwner: true,
            userRole: UserRole.ADMIN,
          },
        },
        201
      );
    } catch (error) {
      logger.error("Error creating workspace:", error);
      return c.json({ error: "Failed to create workspace" }, 500);
    }
  }
);

// Update workspace (only for owners)
workspaceManagementRoutes.put(
  "/workspaces/:workspaceId",
  zValidator("json", updateWorkspaceSchema),
  async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.param("workspaceId");
    const updateData = c.req.valid("json");

    try {
      // Check if user owns this workspace
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          ownerId: user.id,
        },
      });

      if (!workspace) {
        return c.json(
          {
            error:
              "Workspace not found or you don't have permission to update it",
          },
          404
        );
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== workspace.name) {
        const existingWorkspace = await prisma.workspace.findFirst({
          where: {
            ownerId: user.id,
            name: updateData.name,
            id: { not: workspaceId },
          },
        });

        if (existingWorkspace) {
          return c.json(
            { error: "A workspace with this name already exists" },
            409
          );
        }
      }

      // Update the workspace
      const updatedWorkspace = await prisma.workspace.update({
        where: { id: workspaceId },
        data: updateData,
        include: {
          _count: {
            select: {
              users: true,
              servers: true,
            },
          },
        },
      });

      logger.info("Workspace updated successfully", {
        workspaceId,
        userId: user.id,
        updateData,
      });

      return c.json({
        workspace: {
          ...updatedWorkspace,
          isOwner: true,
          userRole: UserRole.ADMIN,
        },
      });
    } catch (error) {
      logger.error("Error updating workspace:", error);
      return c.json({ error: "Failed to update workspace" }, 500);
    }
  }
);

// Delete workspace (only for owners)
workspaceManagementRoutes.delete("/workspaces/:workspaceId", async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");

  try {
    // Check if user owns this workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: user.id,
      },
    });

    if (!workspace) {
      return c.json(
        {
          error:
            "Workspace not found or you don't have permission to delete it",
        },
        404
      );
    }

    // Prevent deletion of user's current workspace
    if (workspaceId === user.workspaceId) {
      return c.json(
        { error: "Cannot delete your current active workspace" },
        400
      );
    }

    // Delete the workspace (this will cascade delete related records)
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    logger.info("Workspace deleted successfully", {
      workspaceId,
      userId: user.id,
    });

    return c.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    logger.error("Error deleting workspace:", error);
    return c.json({ error: "Failed to delete workspace" }, 500);
  }
});

// Switch active workspace
workspaceManagementRoutes.post("/workspaces/:workspaceId/switch", async (c) => {
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");

  try {
    // Check if user has access to this workspace (owner or member)
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: user.id },
          {
            users: {
              some: {
                id: user.id,
              },
            },
          },
        ],
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found or access denied" }, 404);
    }

    // Update user's active workspace
    await prisma.user.update({
      where: { id: user.id },
      data: { workspaceId },
    });

    logger.info("User switched workspace", {
      userId: user.id,
      newWorkspaceId: workspaceId,
      previousWorkspaceId: user.workspaceId,
    });

    return c.json({
      message: "Workspace switched successfully",
      workspaceId,
    });
  } catch (error) {
    logger.error("Error switching workspace:", error);
    return c.json({ error: "Failed to switch workspace" }, 500);
  }
});

export default workspaceManagementRoutes;
