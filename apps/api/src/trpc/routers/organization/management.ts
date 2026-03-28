import { getOrgPlan } from "@/services/plan/plan.service";

import { UpdateOrganizationSchema } from "@/schemas/organization";

import {
  rateLimitedOrgAdminProcedure,
  rateLimitedOrgProcedure,
  rateLimitedProcedure,
  router,
} from "@/trpc/trpc";

/**
 * Organization management router
 * Handles organization CRUD and billing info
 */
export const managementRouter = router({
  /**
   * Get current user's organization (PROTECTED)
   * Uses ctx.organizationId resolved from the user's active workspace
   */
  getCurrent: rateLimitedOrgProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: {
        _count: {
          select: {
            members: true,
            workspaces: true,
          },
        },
      },
    });

    if (!org) {
      return null;
    }

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        contactEmail: org.contactEmail,
        logoUrl: org.logoUrl,
        createdAt: org.createdAt.toISOString(),
        _count: org._count,
      },
      role: ctx.orgRole,
    };
  }),

  /**
   * List all organizations the current user belongs to (PROTECTED)
   */
  listMyOrganizations: rateLimitedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.organizationMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            _count: {
              select: { workspaces: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
        workspaceCount: m.organization._count.workspaces,
      })),
    };
  }),

  /**
   * Update organization (PROTECTED - OWNER/ADMIN only)
   * Uses ctx.organizationId and ctx.orgRole for authorization
   */
  update: rateLimitedOrgAdminProcedure
    .input(UpdateOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      const updated = await ctx.prisma.organization.update({
        where: { id: ctx.organizationId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.contactEmail !== undefined && {
            contactEmail: input.contactEmail,
          }),
          ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        },
        include: {
          _count: {
            select: {
              members: true,
              workspaces: true,
            },
          },
        },
      });

      ctx.logger.info(
        {
          organizationId: updated.id,
          userId: ctx.user.id,
        },
        "Organization updated successfully"
      );

      return {
        organization: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          contactEmail: updated.contactEmail,
          logoUrl: updated.logoUrl,
          createdAt: updated.createdAt.toISOString(),
          _count: updated._count,
        },
      };
    }),

  /**
   * Get organization billing info (PROTECTED - OWNER/ADMIN only)
   * Uses ctx.organizationId and ctx.orgRole for authorization
   */
  getBillingInfo: rateLimitedOrgAdminProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: {
        subscription: true,
      },
    });

    if (!org) {
      return null;
    }

    const plan = await getOrgPlan(org.id);

    return {
      organizationId: org.id,
      plan,
      stripeCustomerId: org.stripeCustomerId,
      subscription: org.subscription
        ? {
            id: org.subscription.id,
            status: org.subscription.status,
            plan: org.subscription.plan,
            billingInterval: org.subscription.billingInterval,
            currentPeriodEnd: org.subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: org.subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }),
});
