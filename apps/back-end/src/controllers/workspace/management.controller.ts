import { zValidator } from "@hono/zod-validator";
import { UserPlan, UserRole } from "@prisma/client";
import { Hono } from "hono";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import {
  ensureWorkspaceMember,
  getUserWorkspaceRole,
} from "@/core/workspace-access";

import {
  canUserAddWorkspaceWithCount,
  getPlanFeatures,
  PlanLimitExceededError,
  validateWorkspaceCreation,
} from "@/services/plan/plan.service";

import { checkWorkspaceAccess } from "@/middlewares/workspace";

import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from "@/schemas/workspace";

const workspaceManagementRoutes = new Hono();

// Get user's workspaces (owned and member workspaces)
workspaceManagementRoutes.get("/", async (c) => {
  const user = c.get("user");

  try {
    // Get all workspaces where user is a member (via WorkspaceMember or owner)
    // SECURITY: We only check ownerId and WorkspaceMember relationships.
    // We do NOT use user.workspaceId for access control, as it could be set
    // to a workspace the user doesn't actually have access to.
    const allUserWorkspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          // Workspaces owned by the user
          { ownerId: user.id },
          // Workspaces where user is a member (via WorkspaceMember)
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            members: true,
            servers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format the response with user role from WorkspaceMember
    const workspaces = await Promise.all(
      allUserWorkspaces.map(async (workspace) => {
        const isOwner = workspace.ownerId === user.id;
        const userRole = isOwner
          ? UserRole.ADMIN
          : (await getUserWorkspaceRole(user.id, workspace.id)) ||
            UserRole.USER;

        return {
          ...workspace,
          isOwner,
          userRole,
        };
      })
    );

    return c.json({ workspaces });
  } catch (error) {
    logger.error({ error }, "Error fetching user workspaces:");
    return c.json({ error: "Failed to fetch workspaces" }, 500);
  }
});

// Get workspace creation info for current user
workspaceManagementRoutes.get("/creation-info", async (c) => {
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
    logger.error({ error }, "Error fetching workspace creation info:");
    return c.json({ error: "Failed to fetch workspace creation info" }, 500);
  }
});

// Create a new workspace
workspaceManagementRoutes.post(
  "/",
  zValidator("json", CreateWorkspaceSchema),
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
                members: true,
                servers: true,
              },
            },
          },
        });

        // Add owner to WorkspaceMember table with ADMIN role
        await ensureWorkspaceMember(user.id, workspace.id, UserRole.ADMIN, tx);

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

      logger.info(
        {
          workspaceId: newWorkspace.id,
          userId: user.id,
          workspaceName: name,
        },
        "Workspace created successfully"
      );

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
      logger.error({ error }, "Error creating workspace:");
      return c.json({ error: "Failed to create workspace" }, 500);
    }
  }
);

// Update workspace (only for owners)
workspaceManagementRoutes.put(
  "/:workspaceId",
  zValidator("json", UpdateWorkspaceSchema),
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
              members: true,
              servers: true,
            },
          },
        },
      });

      logger.info(
        {
          workspaceId,
          userId: user.id,
          updateData,
        },
        "Workspace updated successfully"
      );

      return c.json({
        workspace: {
          ...updatedWorkspace,
          isOwner: true,
          userRole: UserRole.ADMIN,
        },
      });
    } catch (error) {
      logger.error({ error }, "Error updating workspace:");
      return c.json({ error: "Failed to update workspace" }, 500);
    }
  }
);

// Delete workspace (only for owners)
workspaceManagementRoutes.delete("/:workspaceId", async (c) => {
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

    logger.info(
      {
        workspaceId,
        userId: user.id,
      },
      "Workspace deleted successfully"
    );

    return c.json({ message: "Workspace deleted successfully" });
  } catch (error) {
    logger.error({ error }, "Error deleting workspace:");
    return c.json({ error: "Failed to delete workspace" }, 500);
  }
});

// Switch active workspace
workspaceManagementRoutes.post(
  "/:workspaceId/switch",
  checkWorkspaceAccess,
  async (c) => {
    const user = c.get("user");
    const workspaceId = c.req.param("workspaceId");

    try {
      // Verify workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Update user's active workspace
      await prisma.user.update({
        where: { id: user.id },
        data: { workspaceId },
      });

      logger.info(
        {
          userId: user.id,
          newWorkspaceId: workspaceId,
          previousWorkspaceId: user.workspaceId,
        },
        "User switched workspace"
      );

      return c.json({
        message: "Workspace switched successfully",
        workspaceId,
      });
    } catch (error) {
      logger.error({ error }, "Error switching workspace:");
      return c.json({ error: "Failed to switch workspace" }, 500);
    }
  }
);

export default workspaceManagementRoutes;
