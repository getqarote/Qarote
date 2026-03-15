import { TRPCError } from "@trpc/server";

import { getOrgPlan } from "@/services/plan/plan.service";

import { UpdateOrganizationSchema } from "@/schemas/organization";

import { rateLimitedProcedure, router } from "@/trpc/trpc";

import { OrgRole } from "@/generated/prisma/client";

/**
 * Organization management router
 * Handles organization CRUD and billing info
 */
export const managementRouter = router({
  /**
   * Get current user's organization (PROTECTED)
   */
  getCurrent: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    const membership = await ctx.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                workspaces: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    return {
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        contactEmail: membership.organization.contactEmail,
        logoUrl: membership.organization.logoUrl,
        createdAt: membership.organization.createdAt.toISOString(),
        _count: membership.organization._count,
      },
      role: membership.role,
    };
  }),

  /**
   * Update organization (PROTECTED - OWNER/ADMIN only)
   */
  update: rateLimitedProcedure
    .input(UpdateOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;

      const membership = await ctx.prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
        },
        select: { organizationId: true },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization OWNER or ADMIN role required",
        });
      }

      const updated = await ctx.prisma.organization.update({
        where: { id: membership.organizationId },
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
          userId: user.id,
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
   * Delegates to existing plan service
   */
  getBillingInfo: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    const membership = await ctx.prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        role: { in: [OrgRole.OWNER, OrgRole.ADMIN] },
      },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    const org = membership.organization;
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
