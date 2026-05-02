import { TRPCError } from "@trpc/server";

import { getLicensePayload } from "@/services/feature-gate";
import {
  getOrgPlan,
  getPlanFeatures,
  PLAN_FEATURES,
} from "@/services/plan/plan.service";

import { isSelfHostedMode } from "@/config/deployment";

import {
  rateLimitedOrgProcedure,
  rateLimitedProcedure,
  router,
} from "@/trpc/trpc";

import { UserPlan } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Organization plan router
 * Plan is an org-level concept — all workspaces in an org share the same plan.
 */
export const orgPlanRouter = router({
  /**
   * Get all available plans with their features
   */
  getAllPlans: rateLimitedProcedure.query(async ({ ctx }) => {
    try {
      const allPlans = Object.entries(PLAN_FEATURES).map(
        ([planKey, features]) => ({
          plan: planKey as UserPlan,
          ...features,
        })
      );

      return { plans: allPlans };
    } catch (error) {
      ctx.logger.error({ error }, "Error fetching plan information");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "billing.failedToFetchPlanInfo"),
      });
    }
  }),

  /**
   * Get current organization's plan features and usage (PROTECTED)
   * Resolves plan via workspace → organization → subscription.
   */
  getCurrentOrgPlan: rateLimitedOrgProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      // Get user with workspace information
      const userWithWorkspace = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          workspace: {
            include: {
              _count: {
                select: {
                  members: true,
                  servers: true,
                },
              },
            },
          },
        },
      });

      if (!userWithWorkspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "auth.userNotFound"),
        });
      }

      // Resolve plan from the org — ctx.organizationId is guaranteed by orgScopedProcedure.
      const currentWorkspace = userWithWorkspace.workspace;
      let workspacePlan: UserPlan = await getOrgPlan(ctx.organizationId);

      // Self-hosted fallback: if no Stripe subscription exists, use the license JWT tier
      if (workspacePlan === UserPlan.FREE && isSelfHostedMode()) {
        const licensePayload = await getLicensePayload();
        if (licensePayload) {
          workspacePlan = licensePayload.tier;
        }
      }

      // Use workspace plan for all workspace features
      const planFeatures = getPlanFeatures(workspacePlan);

      // Count workspaces in the current organization
      const workspaceCount = await ctx.prisma.workspace.count({
        where: { organizationId: ctx.organizationId },
      });

      // Get current workspace counts
      const workspaceUsers = currentWorkspace?._count.members || 0;
      const workspaceServers = currentWorkspace?._count.servers || 0;

      // Calculate usage percentages and limits
      const usage = {
        users: {
          current: workspaceUsers,
          limit: planFeatures.maxUsers,
          percentage: planFeatures.maxUsers
            ? Math.round((workspaceUsers / planFeatures.maxUsers) * 100)
            : 0,
          canAdd: planFeatures.maxUsers
            ? workspaceUsers < planFeatures.maxUsers
            : true,
        },
        servers: {
          current: workspaceServers,
          limit: planFeatures.maxServers,
          percentage: planFeatures.maxServers
            ? Math.round((workspaceServers / planFeatures.maxServers) * 100)
            : 0,
          canAdd: planFeatures.maxServers
            ? workspaceServers < planFeatures.maxServers
            : true,
        },
        workspaces: {
          current: workspaceCount,
          limit: planFeatures.maxWorkspaces,
          percentage: planFeatures.maxWorkspaces
            ? Math.round((workspaceCount / planFeatures.maxWorkspaces) * 100)
            : 0,
          canAdd: planFeatures.maxWorkspaces
            ? workspaceCount < planFeatures.maxWorkspaces
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
        user: {
          id: userWithWorkspace.id,
          email: userWithWorkspace.email,
          plan: workspacePlan,
          subscriptionStatus: null,
          trialEnd: null,
        },
        workspace: currentWorkspace
          ? {
              id: currentWorkspace.id,
              name: currentWorkspace.name,
            }
          : null,
        planFeatures,
        usage,
        warnings,
        approachingLimits: Object.values(warnings).some(Boolean),
      };

      return response;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error(
        { error, userId: user.id },
        "Error fetching current plan"
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "billing.failedToFetchPlanInfo"),
      });
    }
  }),
});
