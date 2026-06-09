import { TRPCError } from "@trpc/server";

import {
  ensureWorkspaceMember,
  getUserWorkspaceRole,
} from "@/core/workspace-access";

import { recordFromContext } from "@/services/audit";
import { isFeatureEnabled } from "@/services/feature-gate/license";
import {
  getOrgPlan,
  getOrgResourceCounts,
  validateWorkspaceCreation,
} from "@/services/plan/plan.service";
import { trackEvent } from "@/services/posthog";

import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  WorkspaceIdParamSchema,
} from "@/schemas/workspace";

import { managedLlmConfig } from "@/config";
import { FEATURES } from "@/config/features";

import { WorkspaceMapper } from "@/mappers/workspace";

import {
  planValidationProcedure,
  rateLimitedProcedure,
  router,
  workspacePermissionProcedure,
  workspaceProcedure,
} from "@/trpc/trpc";

import {
  LlmProvider,
  OrgRole,
  UserPlan,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * Invalidate all cached sessions for a user so that the next request
 * re-reads fresh data from the database (bypassing the 5-minute cookie cache).
 * Called after any mutation that changes User.role or User.workspaceId.
 */
async function invalidateUserSessions(
  prisma: {
    session: {
      deleteMany: (args: { where: { userId: string } }) => Promise<unknown>;
    };
  },
  userId: string
): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

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

      // Format the response with user role from WorkspaceMember.
      // If membership disappeared between the findMany and this lookup
      // (concurrent removal), skip the workspace rather than 500 — the
      // user is genuinely no longer entitled to see it in the list.
      const workspaces = (
        await Promise.all(
          allUserWorkspaces.map(async (workspace) => {
            const userRole = await getUserWorkspaceRole(
              user.id,
              workspace.id,
              ctx.prisma
            );
            if (!userRole) return null;
            const isOwner = userRole === WorkspaceRole.OWNER;
            const mappedWorkspace = WorkspaceMapper.toApiResponse(workspace);
            return {
              ...mappedWorkspace,
              isOwner,
              userRole,
            };
          })
        )
      ).filter((w): w is NonNullable<typeof w> => w !== null);

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
        const orgResolution = await ctx.resolveOrg();
        let organizationId = orgResolution?.organizationId ?? null;
        let orgRole = orgResolution?.role ?? null;

        // Existing org members must be OWNER or ADMIN to create workspaces
        if (
          organizationId &&
          orgRole !== OrgRole.OWNER &&
          orgRole !== OrgRole.ADMIN
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: te(ctx.locale, "auth.orgAdminRequired"),
          });
        }

        // Auto-create an organization for the user if they don't have one.
        // Use a transaction with a re-check to prevent concurrent requests
        // from creating duplicate organizations for the same user.
        if (!organizationId) {
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
            organizationId = created.id;
            orgRole = OrgRole.OWNER;
          } catch (orgError) {
            // P2002: unique constraint on slug — concurrent request already created the org
            if ((orgError as { code?: string }).code === "P2002") {
              const existingOrg = await ctx.prisma.organization.findUnique({
                where: { slug: orgSlug },
                select: { id: true },
              });
              const membership = existingOrg
                ? await ctx.prisma.organizationMember.findFirst({
                    where: { userId: user.id, organizationId: existingOrg.id },
                    select: { role: true },
                  })
                : null;
              if (existingOrg && membership) {
                organizationId = existingOrg.id;
                orgRole = membership.role;
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
        const currentPlan = await getOrgPlan(organizationId);
        const orgCounts = await getOrgResourceCounts(organizationId);
        const workspaceCount = orgCounts.workspaces;

        // Validate workspace creation against plan limits
        // Errors will be caught by planValidationProcedure middleware
        validateWorkspaceCreation(currentPlan, workspaceCount);

        // Check if workspace name already exists in this organization
        const existingWorkspace = await ctx.prisma.workspace.findFirst({
          where: {
            organizationId: organizationId,
            name: name,
          },
        });

        if (existingWorkspace) {
          throw new TRPCError({
            code: "CONFLICT",
            message: te(ctx.locale, "workspace.nameAlreadyExists"),
          });
        }

        // Should this workspace get a pre-provisioned MANAGED LLM config?
        // True only when the platform itself offers managed LLM (env vars
        // present) AND the AI-explain feature is part of the licensed/cloud
        // surface. Computed before the transaction so we don't add latency
        // inside the tx; the result is a plain boolean that flows in.
        //
        // Treat any `isFeatureEnabled` rejection as `false` rather than
        // propagating it — a license/cache failure must not block workspace
        // creation. The cost of a missing seed is a one-time "configure LLM"
        // toast for the user; the cost of failing create is they can't
        // onboard at all.
        //
        // Follow-up: seed on plan upgrade for workspaces created while the
        // feature was disabled. Tracked separately — out of scope here.
        // Short-circuit when the platform itself doesn't offer managed LLM —
        // no point in paying the license/cache lookup if the seed would
        // always be skipped. The vast majority of self-hosted instances
        // land here.
        let seedManagedLlm = false;
        if (managedLlmConfig.enabled) {
          try {
            seedManagedLlm = await isFeatureEnabled(FEATURES.AI_EXPLAIN_INLINE);
          } catch (err) {
            ctx.logger.warn(
              { err },
              "isFeatureEnabled threw during workspace create — degrading LLM auto-seed to false"
            );
          }
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
              organizationId: organizationId,
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

          // Workspace creator becomes its OWNER.
          await ensureWorkspaceMember(
            user.id,
            workspace.id,
            WorkspaceRole.OWNER,
            tx
          );

          // If this is the user's first workspace (they don't have a
          // workspaceId), assign them to it. Do NOT touch User.role —
          // that's the platform-scoped role used to gate Qarote-staff
          // features (self-hosted setup). Granting
          // platform ADMIN to every signup would let regular users hit
          // those cross-tenant endpoints (rbac.md §2.3, §10 carve-out).
          if (!user.workspaceId) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                workspaceId: workspace.id,
                onboardingCompletedAt: new Date(),
              },
            });
          }

          // Pre-provision a MANAGED LLM config so AI Explain works on the
          // first attempt without the user visiting Settings → LLM first.
          // `updatedById: null` is the schema-supported marker for
          // system-created rows (the column is intentionally nullable);
          // the next user save overwrites it to ctx.user.id. Same tx so
          // there's no window where a workspace exists without its seed.
          if (seedManagedLlm) {
            await tx.workspaceLlmConfig.create({
              data: {
                workspaceId: workspace.id,
                provider: LlmProvider.MANAGED,
                enabled: true,
              },
            });
          }

          return workspace;
        });

        // Invalidate the cookie-cached session so role/workspaceId changes
        // take effect immediately (cookie cache TTL is 5 minutes otherwise).
        await invalidateUserSessions(
          ctx.prisma as unknown as Parameters<typeof invalidateUserSessions>[0],
          user.id
        ).catch((err) => {
          ctx.logger.warn(
            { err, userId: user.id },
            "Failed to invalidate user sessions after workspace create — stale session may persist up to 5 min"
          );
        });

        ctx.logger.info(
          {
            workspaceId: newWorkspace.id,
            userId: user.id,
            workspaceName: name,
          },
          "Workspace created successfully"
        );

        trackEvent(
          {
            distinctId: user.id,
            superProperties: {
              app: "api",
              workspace_id: newWorkspace.id,
              organization_id: organizationId,
            },
          },
          "workspace_created",
          {
            workspace_id: newWorkspace.id,
            organization_id: organizationId,
            is_first_workspace: !user.workspaceId,
            name_length: name.length,
            // Observability for the managed-LLM auto-seed path. Lets us
            // confirm cloud signups land in the "explain works first try"
            // bucket and spot regressions if the feature flag flips.
            llm_auto_seeded: seedManagedLlm,
          }
        );

        void recordFromContext(
          { ...ctx, workspaceId: newWorkspace.id },
          {
            action: "workspace.created",
            category: "workspace",
            entityType: "workspace",
            entityId: newWorkspace.id,
            entityLabel: newWorkspace.name,
            metadata: {
              organizationId,
              isFirstWorkspace: !user.workspaceId,
            },
          }
        );

        return {
          workspace: {
            ...WorkspaceMapper.toApiResponse(newWorkspace),
            isOwner: true,
            userRole: WorkspaceRole.OWNER,
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
   * Update workspace (workspace:update).
   */
  update: workspacePermissionProcedure("workspace:update")
    .input(WorkspaceIdParamSchema.merge(UpdateWorkspaceSchema))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId, ...updateData } = input;
      const role = ctx.workspaceRole;

      try {
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

        void recordFromContext(ctx, {
          action: "workspace.updated",
          category: "workspace",
          entityType: "workspace",
          entityId: workspaceId,
          entityLabel: updatedWorkspace.name,
          metadata: { changes: updateData },
        });

        return {
          workspace: {
            ...WorkspaceMapper.toApiResponse(updatedWorkspace),
            isOwner: role === WorkspaceRole.OWNER,
            userRole: role,
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
   * Delete workspace (workspace:delete — OWNER only per the catalog).
   */
  delete: workspacePermissionProcedure("workspace:delete")
    .input(WorkspaceIdParamSchema)
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const { workspaceId } = input;

      try {
        const workspace = await ctx.prisma.workspace.findUnique({
          where: { id: workspaceId },
        });

        if (!workspace) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "workspace.notFoundOrNoPermissionDelete"),
          });
        }

        // Snapshot the plan BEFORE delete — the audit emits after the
        // row is gone and `getWorkspacePlan` would otherwise return
        // FREE for the missing workspace, dropping the audit row on
        // every plan including Enterprise. Resolve via the org so the
        // snapshot survives the cascade.
        //
        // On lookup failure, log loudly (silent audit-gate failure is
        // its own compliance issue) but proceed — the workspace.delete
        // mutation must not be blocked by an audit-side error. Null
        // snapshot falls through to the writer's normal plan path,
        // which will see the deleted workspace and skip the row; we
        // accept that loss in exchange for the user being able to
        // delete their workspace.
        let planSnapshot: UserPlan | null = null;
        if (workspace.organizationId) {
          try {
            planSnapshot = await getOrgPlan(workspace.organizationId);
          } catch (planErr) {
            ctx.logger.warn(
              {
                err: planErr,
                workspaceId,
                organizationId: workspace.organizationId,
              },
              "workspace.delete: plan-snapshot lookup failed; audit row may be skipped"
            );
          }
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
            // Membership in WorkspaceMember now covers both regular members
            // and OWNER (the legacy Workspace.ownerId is deprecated under the
            // RBAC model — TODO: drop the column once all reads migrate).
            const next = await tx.workspace.findFirst({
              where: { members: { some: { userId: user.id } } },
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

        // Invalidate session cache — workspaceId changed for this user.
        await invalidateUserSessions(
          ctx.prisma as unknown as Parameters<typeof invalidateUserSessions>[0],
          user.id
        ).catch((err) => {
          ctx.logger.warn(
            { err, userId: user.id },
            "Failed to invalidate user sessions after workspace delete — stale session may persist up to 5 min"
          );
        });

        ctx.logger.info(
          {
            workspaceId,
            userId: user.id,
            switchedTo: nextWorkspace?.id ?? null,
          },
          "Workspace deleted successfully"
        );

        trackEvent(
          {
            distinctId: user.id,
            superProperties: {
              app: "api",
              workspace_id: workspaceId,
            },
          },
          "workspace_deleted",
          { workspace_id: workspaceId }
        );

        // Audit AFTER the row is gone — bind workspaceId + planSnapshot
        // on the entry; the writer would otherwise resolve plan against
        // a now-deleted workspace and silently skip the row.
        void recordFromContext(
          { ...ctx, workspaceId },
          {
            action: "workspace.deleted",
            category: "workspace",
            entityType: "workspace",
            entityId: workspaceId,
            entityLabel: workspace.name,
            planSnapshot,
            metadata: {
              organizationId: workspace.organizationId,
              switchedTo: nextWorkspace?.id ?? null,
            },
          }
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

        // Invalidate session cache — workspaceId changed for this user.
        await invalidateUserSessions(
          ctx.prisma as unknown as Parameters<typeof invalidateUserSessions>[0],
          user.id
        ).catch((err) => {
          ctx.logger.warn(
            { err, userId: user.id },
            "Failed to invalidate user sessions after workspace switch — stale session may persist up to 5 min"
          );
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
