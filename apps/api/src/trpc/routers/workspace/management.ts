import { TRPCError } from "@trpc/server";

import {
  ensureWorkspaceMember,
  getUserWorkspaceRole,
} from "@/core/workspace-access";

import {
  canUserAddWorkspaceWithCount,
  getOrgPlan,
  getOrgResourceCounts,
  getPlanFeatures,
  validateWorkspaceCreation,
} from "@/services/plan/plan.service";

import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  WorkspaceIdParamSchema,
} from "@/schemas/workspace";

import { WorkspaceMapper } from "@/mappers/workspace";

import {
  planValidationProcedure,
  rateLimitedProcedure,
  router,
  workspaceProcedure,
} from "@/trpc/trpc";

import { OrgRole, UserPlan, UserRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Workspace management router
 * Handles workspace creation, updates, deletion, and switching
 */
export const managementRouter = router({
  /**
   * Get user's workspaces (PROTECTED)
   */
  getUserWorkspaces: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      // Get all workspaces where user is a member (via WorkspaceMember)
      const allUserWorkspaces = await ctx.prisma.workspace.findMany({
        where: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
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
          const userRole =
            (await getUserWorkspaceRole(user.id, workspace.id, ctx.prisma)) ||
            UserRole.MEMBER;
          const isOwner = workspace.ownerId === user.id;

          const mappedWorkspace = WorkspaceMapper.toApiResponse(workspace);
          return {
            ...mappedWorkspace,
            isOwner,
            userRole,
          };
        })
      );

      return { workspaces };
    } catch (error) {
      ctx.logger.error({ error }, "Error fetching user workspaces:");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "workspace.failedToFetchWorkspaces"),
      });
    }
  }),

  /**
   * Get workspace creation info (PROTECTED)
   */
  getCreationInfo: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      // Resolve organization from the user's org membership
      const orgMembership = await ctx.prisma.organizationMember.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      const organizationId = orgMembership?.organizationId ?? null;

      let currentPlan: UserPlan = UserPlan.FREE;
      let workspaceCount: number;

      if (organizationId) {
        // Org-scoped: plan and counts come from the organization
        currentPlan = await getOrgPlan(organizationId);
        const orgCounts = await getOrgResourceCounts(organizationId);
        workspaceCount = orgCounts.workspaces;
      } else {
        // No org context — count workspaces owned by the user
        workspaceCount = await ctx.prisma.workspace.count({
          where: { ownerId: user.id },
        });
      }

      const planFeatures = getPlanFeatures(currentPlan);
      const canCreateWorkspace = canUserAddWorkspaceWithCount(
        currentPlan,
        workspaceCount
      );

      return {
        currentPlan: currentPlan,
        workspaceCount,
        maxWorkspaces: planFeatures.maxWorkspaces,
        canCreateWorkspace,
        planFeatures: {
          displayName: planFeatures.displayName,
          description: planFeatures.description,
          maxWorkspaces: planFeatures.maxWorkspaces,
        },
      };
    } catch (error) {
      ctx.logger.error({ error }, "Error fetching workspace creation info:");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "workspace.failedToFetchCreationInfo"),
      });
    }
  }),

  /**
   * Create a new workspace (PROTECTED with plan validation)
   * Note: First workspace creation is allowed in community mode for onboarding.
   * Subsequent workspace management operations (update, delete, switch) require premium features.
   */
  create: planValidationProcedure
    .input(CreateWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { name, contactEmail: inputContactEmail, tags } = input;
      const contactEmail = inputContactEmail || user.email;

      try {
        // Resolve organization from the user's org membership
        let membership = await ctx.prisma.organizationMember.findFirst({
          where: { userId: user.id },
          select: { organizationId: true, role: true },
        });

        // Existing org members must be OWNER or ADMIN to create workspaces
        if (
          membership &&
          membership.role !== OrgRole.OWNER &&
          membership.role !== OrgRole.ADMIN
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "auth.orgAdminRequired"),
          });
        }

        // Auto-create an organization for the user if they don't have one.
        // Use a transaction with a re-check to prevent concurrent requests
        // from creating duplicate organizations for the same user.
        if (!membership) {
          // Deterministic slug ensures the unique constraint on Organization.slug
          // prevents duplicate orgs from concurrent requests for the same user.
          const orgSlug = `user-${user.id}`;
          const orgName = user.firstName
            ? `${user.firstName}'s Organization`
            : "My Organization";

          try {
            const created = await ctx.prisma.organization.create({
              data: {
                name: orgName,
                slug: orgSlug,
                contactEmail: user.email,
                members: {
                  create: {
                    userId: user.id,
                    role: OrgRole.OWNER,
                  },
                },
              },
            });
            membership = { organizationId: created.id, role: OrgRole.OWNER };
          } catch (orgError) {
            // P2002: unique constraint on slug — concurrent request already created the org
            if ((orgError as { code?: string }).code === "P2002") {
              const existing = await ctx.prisma.organizationMember.findFirst({
                where: { userId: user.id },
                select: { organizationId: true, role: true },
              });
              if (existing) {
                membership = existing;
              } else {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: te(ctx.locale, "workspace.failedToCreate"),
                });
              }
            } else {
              ctx.logger.error(
                { error: orgError, userId: user.id },
                "Failed to auto-create organization for user"
              );
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: te(ctx.locale, "workspace.failedToCreate"),
              });
            }
          }
        }

        // Org-scoped validation
        const currentPlan = await getOrgPlan(membership.organizationId);
        const orgCounts = await getOrgResourceCounts(membership.organizationId);
        const workspaceCount = orgCounts.workspaces;

        // Validate workspace creation against plan limits
        // Errors will be caught by planValidationProcedure middleware
        validateWorkspaceCreation(currentPlan, workspaceCount);

        // Check if workspace name already exists in this organization
        const existingWorkspace = await ctx.prisma.workspace.findFirst({
          where: {
            organizationId: membership.organizationId,
            name: name,
          },
        });

        if (existingWorkspace) {
          throw new TRPCError({
            code: "CONFLICT",
            message: te(ctx.locale, "workspace.nameAlreadyExists"),
          });
        }

        // Create the new workspace and assign user to it
        const newWorkspace = await ctx.prisma.$transaction(async (tx) => {
          // Create the workspace linked to the user's organization
          const workspace = await tx.workspace.create({
            data: {
              name,
              contactEmail,
              tags: tags ? tags : undefined, // Store tags as JSON array or undefined
              ownerId: user.id,
              organizationId: membership.organizationId,
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
          await ensureWorkspaceMember(
            user.id,
            workspace.id,
            UserRole.ADMIN,
            tx
          );

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

        ctx.logger.info(
          {
            workspaceId: newWorkspace.id,
            userId: user.id,
            workspaceName: name,
          },
          "Workspace created successfully"
        );

        return {
          workspace: {
            ...WorkspaceMapper.toApiResponse(newWorkspace),
            isOwner: true,
            userRole: UserRole.ADMIN,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error creating workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "workspace.failedToCreate"),
        });
      }
    }),

  /**
   * Update workspace (PROTECTED - owner only)
   */
  update: rateLimitedProcedure
    .input(WorkspaceIdParamSchema.merge(UpdateWorkspaceSchema))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId, ...updateData } = input;

      try {
        // Check if user has ADMIN role in this workspace
        const role = await getUserWorkspaceRole(
          user.id,
          workspaceId,
          ctx.prisma
        );
        if (role !== UserRole.ADMIN) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "workspace.notFoundOrNoPermissionUpdate"),
          });
        }

        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "workspace.notFoundOrNoPermissionUpdate"),
          });
        }

        // Check for name conflicts if name is being updated
        if (updateData.name && updateData.name !== workspace.name) {
          const existingWorkspace = await ctx.prisma.workspace.findFirst({
            where: {
              organizationId: workspace.organizationId,
              name: updateData.name,
              id: { not: workspaceId },
            },
          });

          if (existingWorkspace) {
            throw new TRPCError({
              code: "CONFLICT",
              message: te(ctx.locale, "workspace.nameAlreadyExists"),
            });
          }
        }

        // Update the workspace
        const updatedWorkspace = await ctx.prisma.workspace.update({
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

        ctx.logger.info(
          {
            workspaceId,
            userId: user.id,
            updateData,
          },
          "Workspace updated successfully"
        );

        return {
          workspace: {
            ...WorkspaceMapper.toApiResponse(updatedWorkspace),
            isOwner: user.id === updatedWorkspace.ownerId,
            userRole: UserRole.ADMIN,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error updating workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "workspace.failedToUpdate"),
        });
      }
    }),

  /**
   * Delete workspace (PROTECTED - owner only)
   */
  delete: rateLimitedProcedure
    .input(WorkspaceIdParamSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId } = input;

      try {
        // Check if user has ADMIN role in this workspace
        const role = await getUserWorkspaceRole(
          user.id,
          workspaceId,
          ctx.prisma
        );
        if (role !== UserRole.ADMIN) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "workspace.notFoundOrNoPermissionDelete"),
          });
        }

        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "workspace.notFoundOrNoPermissionDelete"),
          });
        }

        // Delete the workspace in a transaction:
        // 1. Detach users (User.workspace has onDelete: Cascade, so without this all user accounts would be deleted)
        // 2. Delete orphan-prone records that lack onDelete: Cascade on their workspace relation
        // 3. Delete the workspace (cascade deletes remaining related data)
        const nextWorkspace = await ctx.prisma.$transaction(async (tx) => {
          await tx.user.updateMany({
            where: { workspaceId },
            data: { workspaceId: null },
          });
          await tx.rabbitMQServer.deleteMany({
            where: { workspaceId },
          });
          await tx.feedback.deleteMany({
            where: { workspaceId },
          });
          await tx.workspace.delete({
            where: { id: workspaceId },
          });

          // Auto-switch the requesting user to their next available workspace.
          // The updateMany above nulled all users' workspaceId (including the
          // requester's), so we must always re-set it here.
          //
          // If the deleted workspace was the user's active one, find the next
          // available workspace.  Otherwise, restore their previous workspaceId
          // so their session is not disrupted.
          const wasActive = user.workspaceId === workspaceId;

          if (wasActive) {
            // Check both ownership and membership (same logic as getUserWorkspaces)
            const next = await tx.workspace.findFirst({
              where: {
                OR: [
                  { ownerId: user.id },
                  { members: { some: { userId: user.id } } },
                ],
              },
              orderBy: { createdAt: "desc" },
              select: { id: true },
            });

            await tx.user.update({
              where: { id: user.id },
              data: { workspaceId: next?.id ?? null },
            });

            return next;
          }

          // Restore the user's previous workspaceId (nulled by updateMany above)
          await tx.user.update({
            where: { id: user.id },
            data: { workspaceId: user.workspaceId },
          });

          return { id: user.workspaceId } as { id: string };
        });

        ctx.logger.info(
          {
            workspaceId,
            userId: user.id,
            switchedTo: nextWorkspace?.id ?? null,
          },
          "Workspace deleted successfully"
        );

        return {
          message: te(ctx.locale, "messages.workspaceDeletedSuccess"),
          switchedTo: nextWorkspace?.id ?? null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error deleting workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "workspace.failedToDelete"),
        });
      }
    }),

  /**
   * Switch active workspace (WORKSPACE)
   */
  switch: workspaceProcedure
    .input(WorkspaceIdParamSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId } = input;

      try {
        // Verify workspace exists
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "workspace.notFound"),
          });
        }

        // Update user's active workspace
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { workspaceId },
        });

        ctx.logger.info(
          {
            userId: user.id,
            newWorkspaceId: workspaceId,
            previousWorkspaceId: user.workspaceId,
          },
          "User switched workspace"
        );

        return {
          message: te(ctx.locale, "messages.workspaceSwitchedSuccess"),
          workspaceId,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error switching workspace:");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "workspace.failedToSwitch"),
        });
      }
    }),
});
