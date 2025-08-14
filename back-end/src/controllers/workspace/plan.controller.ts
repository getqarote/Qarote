import { Hono } from "hono";
import { UserRole, WorkspacePlan } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authorize } from "@/core/auth";
import { PLAN_FEATURES, getPlanFeatures } from "@/services/plan/plan.service";

const planRoutes = new Hono();

// Get all available plans with their features (ADMIN ONLY - sensitive pricing data)
planRoutes.get("/plans", authorize([UserRole.ADMIN]), async (c) => {
  try {
    const allPlans = Object.entries(PLAN_FEATURES).map(
      ([planKey, features]) => ({
        plan: planKey as WorkspacePlan,
        ...features,
      })
    );

    return c.json({ plans: allPlans });
  } catch (error) {
    logger.error("Error fetching plan information:", error);
    return c.json({ error: "Failed to fetch plan information" }, 500);
  }
});

// Get current user's plan features and usage (USER - can only see their own workspace plan)
planRoutes.get("/current/plan", async (c) => {
  const user = c.get("user");

  try {
    // Get user's workspace with plan and current usage
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      include: {
        _count: {
          select: {
            users: true,
            servers: true,
          },
        },
      },
    });

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // Security check: Ensure user can only access their own workspace
    if (workspace.id !== user.workspaceId) {
      return c.json(
        { error: "Access denied: Cannot access other workspace data" },
        403
      );
    }

    // Get plan features
    const planFeatures = getPlanFeatures(workspace.plan);

    // Calculate usage percentages and limits
    const usage = {
      users: {
        current: workspace._count.users,
        limit: planFeatures.maxUsers,
        percentage: planFeatures.maxUsers
          ? Math.round((workspace._count.users / planFeatures.maxUsers) * 100)
          : 0,
        canAdd: planFeatures.maxUsers
          ? workspace._count.users < planFeatures.maxUsers
          : true,
      },
      servers: {
        current: workspace._count.servers,
        limit: planFeatures.maxServers,
        percentage: planFeatures.maxServers
          ? Math.round(
              (workspace._count.servers / planFeatures.maxServers) * 100
            )
          : 0,
        canAdd: planFeatures.maxServers
          ? workspace._count.servers < planFeatures.maxServers
          : true,
      },
      workspaces: {
        current: 1, // For now, each user has one workspace
        limit: planFeatures.maxWorkspaces,
        percentage: planFeatures.maxWorkspaces
          ? Math.round((1 / planFeatures.maxWorkspaces) * 100)
          : 0,
        canAdd: planFeatures.maxWorkspaces
          ? 1 < planFeatures.maxWorkspaces
          : true,
      },
    };

    // Check if user is approaching limits (80% threshold)
    const warnings = {
      users: usage.users.percentage >= 80,
      servers: usage.servers.percentage >= 80,
      workspaces: usage.workspaces.percentage >= 80,
    };

    const response = {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
      },
      planFeatures,
      usage,
      warnings,
      approachingLimits: Object.values(warnings).some(Boolean),
    };

    return c.json(response);
  } catch (error) {
    logger.error("Error fetching current plan:", error);
    return c.json({ error: "Failed to fetch plan information" }, 500);
  }
});

export default planRoutes;
