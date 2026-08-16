import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { recordFromContext } from "@/services/audit";
import {
  deleteOrganizationCascade,
  SubscriptionCancelFailedError,
} from "@/services/organization/org-deletion.service";
import { getOrgPlan } from "@/services/plan/plan.service";

import { UpdateOrganizationSchema } from "@/schemas/organization";

import {
  rateLimitedOrgAdminProcedure,
  rateLimitedOrgProcedure,
  rateLimitedProcedure,
  router,
} from "@/trpc/trpc";

import { OrgRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

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
   * Check whether a slug is available (PROTECTED). Returns `available: true`
   * when no OTHER organization owns it — the caller's own current slug counts
   * as available so re-saving an unchanged slug isn't flagged as taken. The
   * unique constraint on save is still the source of truth; this just powers
   * the inline indicator on the org settings form.
   */
  checkSlug: rateLimitedOrgProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(3)
          .max(48)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      })
    )
    .query(async ({ input, ctx }) => {
      const existing = await ctx.prisma.organization.findFirst({
        where: { slug: input.slug, NOT: { id: ctx.organizationId } },
        select: { id: true },
      });
      return { available: !existing };
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
      let updated;
      try {
        updated = await ctx.prisma.organization.update({
          where: { id: ctx.organizationId },
          data: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.slug !== undefined && { slug: input.slug }),
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
      } catch (error) {
        // Slug is @unique — a collision surfaces as a friendly CONFLICT
        // rather than an opaque 500.
        if ((error as { code?: string }).code === "P2002") {
          throw new TRPCError({
            code: "CONFLICT",
            message: te(ctx.locale, "organization.slugTaken"),
          });
        }
        throw error;
      }

      ctx.logger.info(
        {
          organizationId: updated.id,
          userId: ctx.user.id,
        },
        "Organization updated successfully"
      );

      void recordFromContext(ctx, {
        action: "org.updated",
        category: "org",
        entityType: "organization",
        entityId: updated.id,
        entityLabel: updated.name,
        metadata: {
          changes: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.slug !== undefined && { slug: input.slug }),
            ...(input.contactEmail !== undefined && {
              contactEmail: input.contactEmail,
            }),
            ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
          },
        },
        workspaceId: null,
      });

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

  /**
   * Permanently delete the current organization (OWNER only). Cascades all
   * workspaces, members, servers, alerts, etc., and cancels any live Stripe
   * subscription immediately (fail-safe — a Stripe failure aborts the delete).
   *
   * The caller must echo the org slug as `confirmation` — a deliberate friction
   * guard against accidental or automated destruction.
   */
  delete: rateLimitedOrgAdminProcedure
    .input(z.object({ confirmation: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // OWNER-only: an ADMIN can manage the org but not destroy it.
      if (ctx.orgRole !== OrgRole.OWNER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: te(ctx.locale, "organization.deleteOwnerOnly"),
        });
      }

      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { id: true, name: true, slug: true },
      });
      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "organization.notFound"),
        });
      }

      // Typed confirmation must match the slug exactly.
      if (input.confirmation.trim() !== org.slug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "organization.deleteConfirmationMismatch"),
        });
      }

      try {
        await deleteOrganizationCascade(org.id);
      } catch (error) {
        if (error instanceof SubscriptionCancelFailedError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: te(ctx.locale, "organization.deleteSubscriptionFailed"),
          });
        }
        throw error;
      }

      ctx.logger.info(
        { organizationId: org.id, userId: ctx.user.id },
        "Organization deleted by owner"
      );

      // Audit after the row is gone: organizationId is null (FK target deleted),
      // the org identity lives in entityId/label + metadata.
      void recordFromContext(ctx, {
        action: "org.deleted",
        category: "org",
        entityType: "organization",
        entityId: org.id,
        entityLabel: org.name,
        organizationId: null,
        workspaceId: null,
        metadata: { slug: org.slug },
      });

      return { success: true };
    }),
});
