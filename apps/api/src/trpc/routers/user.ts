import { SUPPORTED_LOCALES } from "@qarote/i18n";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { recordFromContext } from "@/services/audit";
import { EmailVerificationService } from "@/services/email/email-verification.service";
import {
  deleteOrganizationCascade,
  SubscriptionCancelFailedError,
} from "@/services/organization/org-deletion.service";

import { hasWorkspaceAccess } from "@/middlewares/workspace";

import { paginateQuery, paginationMeta } from "@/schemas/pagination";
import {
  GetUserSchema,
  GetWorkspaceUsersSchema,
  RemoveUserFromWorkspaceSchema,
  UpdateLocaleSchema,
  UpdateProfileSchema,
} from "@/schemas/user";

import { UserMapper } from "@/mappers/auth";

import {
  rateLimitedProcedure,
  router,
  strictRateLimitedProcedure,
  workspacePermissionProcedure,
} from "@/trpc/trpc";

import {
  assertCanRemoveMember,
  assertWorkspaceWillKeepOwner,
} from "@/auth/workspace-roles";
import { OrgRole, WorkspaceRole } from "@/generated/prisma/client";
import { te } from "@/i18n";

/**
 * User router
 * Handles user profile and workspace user management
 */
export const userRouter = router({
  /**
   * Lightweight onboarding info — no org/workspace scope required.
   * Returns whether the user belongs to an org and its name.
   */
  getOnboardingInfo: rateLimitedProcedure.query(async ({ ctx }) => {
    const [membership, user] = await Promise.all([
      ctx.prisma.organizationMember.findFirst({
        where: { userId: ctx.user.id },
        select: {
          organization: {
            select: { id: true, name: true },
          },
        },
      }),
      ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { onboardingCompletedAt: true },
      }),
    ]);

    return {
      hasOrganization: !!membership,
      organizationName: membership?.organization.name ?? null,
      onboardingCompleted: !!user?.onboardingCompletedAt,
    };
  }),

  /**
   * Get users in the same workspace (member:read).
   */
  getWorkspaceUsers: workspacePermissionProcedure("member:read")
    .input(GetWorkspaceUsersSchema)
    .query(async ({ input, ctx }) => {
      const { workspaceId } = input;

      try {
        const where = { workspaceId };
        const [workspaceMembers, total] = await Promise.all([
          ctx.prisma.workspaceMember.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  image: true,
                  firstName: true,
                  lastName: true,
                  isActive: true,
                  lastLogin: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
              // RBAC Phase 3: role enum field replaced by Role FK
              // relation. Surface builtinKey for the legacy
              // "role" field shape the frontend expects.
              role: { select: { builtinKey: true } },
            },
            orderBy: { createdAt: "desc" },
            ...paginateQuery(input),
          }),
          ctx.prisma.workspaceMember.count({ where }),
        ]);

        // Format response to match expected structure
        const users = workspaceMembers.map((member) => ({
          id: member.user.id,
          // WorkspaceMember.id — required by `workspace.role.assignRole`
          // which addresses members by their membership row. Exposed
          // since PR-4.1 so the team page can bulk-assign without an
          // extra resolution round-trip.
          memberId: member.id,
          email: member.user.email,
          firstName: member.user.firstName,
          lastName: member.user.lastName,
          role: member.role.builtinKey ?? "CUSTOM",
          isActive: member.user.isActive,
          lastLogin: member.user.lastLogin?.toISOString() ?? null,
          createdAt: member.user.createdAt.toISOString(),
          updatedAt: member.user.updatedAt.toISOString(),
        }));

        return {
          users,
          pagination: paginationMeta(input.page, input.limit, total),
        };
      } catch (error) {
        ctx.logger.error(
          { error },
          `Error fetching users for workspace ${workspaceId}`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToFetchUsers"),
        });
      }
    }),

  /**
   * Get current user's profile
   */
  getProfile: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      const profile = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          image: true,
          firstName: true,
          lastName: true,
          workspaceId: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          googleId: true,
          workspace: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              logoUrl: true,
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: te(ctx.locale, "user.profileNotFound"),
        });
      }

      // Serialize date fields to ISO strings
      return {
        profile: {
          ...UserMapper.toApiResponse(profile),
          workspace: profile.workspace
            ? {
                ...profile.workspace,
                createdAt: profile.workspace.createdAt.toISOString(),
                updatedAt: profile.workspace.updatedAt.toISOString(),
                _count: profile.workspace._count,
              }
            : null,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, `Error fetching profile for user ${user.id}`);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "user.failedToFetchProfile"),
      });
    }
  }),

  /**
   * Update own profile
   */
  updateProfile: rateLimitedProcedure
    .input(UpdateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const data = input;
      const user = ctx.user;

      try {
        // Handle email change separately if provided
        if (data.email && data.email !== user.email) {
          // Check if the new email is already in use
          const existingUser = await ctx.prisma.user.findUnique({
            where: { email: data.email },
          });

          if (existingUser) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Email already in use",
            });
          }

          // Set pending email and generate verification token
          await ctx.prisma.user.update({
            where: { id: user.id },
            data: {
              pendingEmail: data.email,
            },
          });

          // Generate and send verification email
          try {
            const verificationToken =
              await EmailVerificationService.generateVerificationToken({
                userId: user.id,
                email: data.email,
                type: "EMAIL_CHANGE",
              });

            const emailResult =
              await EmailVerificationService.sendVerificationEmail(
                data.email,
                verificationToken,
                "EMAIL_CHANGE",
                user.firstName,
                undefined,
                ctx.locale
              );

            if (!emailResult.success) {
              ctx.logger.error(
                { error: emailResult.error },
                "Failed to send email change verification"
              );
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to send verification email",
              });
            }
          } catch (emailError) {
            ctx.logger.error(
              { error: emailError },
              "Failed to send email change verification"
            );
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to send verification email",
            });
          }

          // Remove email from the update data since we're handling it separately
          const { email: _, ...updateData } = data;

          // Update other profile fields (excluding email)
          const updatedUser = await ctx.prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
              id: true,
              email: true,
              image: true,
              firstName: true,
              lastName: true,
              workspaceId: true,
              isActive: true,
              emailVerified: true,
              pendingEmail: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          return {
            user: {
              ...UserMapper.toApiResponse(updatedUser),
              pendingEmail: updatedUser.pendingEmail,
            },
            message:
              "Profile updated. Please check your new email to verify the change.",
          };
        } else {
          // No email change, update normally
          const updatedUser = await ctx.prisma.user.update({
            where: { id: user.id },
            data,
            select: {
              id: true,
              email: true,
              image: true,
              firstName: true,
              lastName: true,
              workspaceId: true,
              isActive: true,
              emailVerified: true,
              pendingEmail: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          return {
            user: {
              ...UserMapper.toApiResponse(updatedUser),
              pendingEmail: updatedUser.pendingEmail,
            },
          };
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error },
          `Error updating profile for user ${user.id}`
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToUpdateProfile"),
        });
      }
    }),

  /**
   * Get a specific user by ID (member:read).
   */
  getUser: workspacePermissionProcedure("member:read")
    .input(GetUserSchema)
    .query(async ({ input, ctx }) => {
      const { id, workspaceId } = input;
      const currentUser = ctx.user;

      try {
        const user = await ctx.prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            image: true,
            firstName: true,
            lastName: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
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
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.userNotFound"),
          });
        }

        // Caller must be the target user themselves, or the target must be
        // a member of the same workspace. Workspace membership is already
        // verified by workspaceProcedure for the caller.
        if (currentUser.id !== user.id) {
          const userIsMember = await hasWorkspaceAccess(user.id, workspaceId);
          if (!userIsMember) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: te(ctx.locale, "user.cannotAccessUser"),
            });
          }
        }

        // Strip platform-scoped fields (role, workspaceId, workspace) when
        // the caller is not the target user. Workspace-scoped role lives in
        // WorkspaceMember; the platform User.role must not leak across users.
        const isSelf = currentUser.id === user.id;
        const apiUser = UserMapper.toApiResponse(user);
        return {
          user: isSelf
            ? { ...apiUser, workspace: user.workspace }
            : {
                ...apiUser,
                role: undefined,
                workspaceId: undefined,
                workspace: undefined,
              },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, `Error fetching user ${id}`);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToFetchUser"),
        });
      }
    }),

  /**
   * Remove user from workspace (member:remove).
   */
  removeFromWorkspace: workspacePermissionProcedure("member:remove")
    .input(RemoveUserFromWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      const { userId: userIdToRemove, workspaceId } = input;
      const currentUser = ctx.user;

      try {
        // Find the user to remove
        const userToRemove = await ctx.prisma.user.findUnique({
          where: {
            id: userIdToRemove,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (!userToRemove) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.userNotFound"),
          });
        }

        // Check if user is a member of this workspace. Test membership
        // existence directly — `getUserWorkspaceRole` returns null for
        // custom-role assignments, which would 404 a legitimate member.
        // The downstream `assertCanRemoveMember` enforces the actual
        // authorization check and returns FORBIDDEN where appropriate.
        const targetMembership = await ctx.prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: { userId: userIdToRemove, workspaceId },
          },
          select: { id: true },
        });

        if (!targetMembership) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "user.isNotMemberOfWorkspace"),
          });
        }

        // Prevent removing yourself
        if (userToRemove.id === currentUser.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "user.cannotRemoveSelf"),
          });
        }

        // Remove user from workspace inside a transaction with the
        // last-OWNER invariant (R-AUTHZ-4). The anti-escalation guard
        // (ADMIN cannot touch ADMIN/OWNER) is enforced against the
        // freshly-read member.role to close the TOCTOU window.
        // Transaction returns whether a delete actually happened so
        // the post-tx log + audit only fire on real removals (the
        // early-return path for "already not a member" must not emit
        // a false-positive audit row).
        const removed = await ctx.prisma.$transaction(async (tx) => {
          const member = await tx.workspaceMember.findUnique({
            where: {
              userId_workspaceId: { userId: userIdToRemove, workspaceId },
            },
            select: {
              id: true,
              role: { select: { builtinKey: true } },
            },
          });
          if (!member) return false; // already not a member

          // Built-in tier checks fail closed when the actor or target
          // is on a custom role. PR-2's `assertCanRemoveMemberCustom`
          // covers the custom branch.
          if (!ctx.workspaceRole || !member.role.builtinKey) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: te(ctx.locale, "auth.workspacePermissionRequired"),
            });
          }
          assertCanRemoveMember(ctx.workspaceRole, member.role.builtinKey);

          if (member.role.builtinKey === WorkspaceRole.OWNER) {
            await assertWorkspaceWillKeepOwner(tx, {
              workspaceId,
              affectedMemberId: member.id,
            });
          }

          await tx.workspaceMember.delete({ where: { id: member.id } });

          // Clear the user's active workspace if it points here.
          await tx.user.updateMany({
            where: { id: userIdToRemove, workspaceId },
            data: { workspaceId: null },
          });
          return true;
        });

        // Concurrent-delete race: the precheck above saw the membership,
        // but a parallel request removed it before our transaction
        // re-read. Report NOT_FOUND consistently rather than claiming
        // success for an operation we didn't actually perform.
        if (!removed) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "user.isNotMemberOfWorkspace"),
          });
        }

        // PII (emails) intentionally omitted — the audit row below
        // already captures actor + target email under the writer's
        // GDPR-erasure rules. Pino keeps only the IDs.
        ctx.logger.info(
          {
            removedUserId: userIdToRemove,
            removedByUserId: currentUser.id,
            workspaceId,
          },
          "User removed from workspace"
        );

        void recordFromContext(ctx, {
          action: "workspace.member.removed",
          category: "workspace",
          entityType: "user",
          entityId: userIdToRemove,
          entityLabel: userToRemove.email,
        });

        return {
          message: "User removed from workspace successfully",
          removedUser: {
            id: userToRemove.id,
            email: userToRemove.email,
            name: `${userToRemove.firstName} ${userToRemove.lastName}`,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error(
          { error, userIdToRemove, currentUserId: currentUser.id },
          "Error removing user from workspace"
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "user.failedToRemoveFromWorkspace"),
        });
      }
    }),

  /**
   * Update user locale preference
   */
  updateLocale: rateLimitedProcedure
    .input(UpdateLocaleSchema)
    .mutation(async ({ input, ctx }) => {
      const { locale } = input;

      if (!SUPPORTED_LOCALES.includes(locale as never)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported locale: ${locale}`,
        });
      }

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { locale },
      });

      return { locale };
    }),

  /**
   * Permanently delete the caller's own account. Smart cascade:
   *   - Organizations where the caller is the SOLE member are torn down
   *     (cancelling any live Stripe subscription, fail-safe).
   *   - Organizations the caller solely OWNS but that have other members BLOCK
   *     the deletion — leaving would orphan them (last-owner invariant). The
   *     caller must transfer ownership / remove members first.
   *   - Other shared orgs: the caller simply leaves (membership cascades).
   *
   * Deleting the User row cascades sessions (immediate sign-out), linked
   * accounts, and remaining memberships. The caller must echo their email to
   * confirm.
   */
  deleteAccount: strictRateLimitedProcedure
    .input(z.object({ confirmation: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      if (
        input.confirmation.trim().toLowerCase() !== ctx.user.email.toLowerCase()
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "user.deleteAccountConfirmationMismatch"),
        });
      }

      const memberships = await ctx.prisma.organizationMember.findMany({
        where: { userId },
        select: {
          organizationId: true,
          role: true,
          organization: {
            select: { name: true, _count: { select: { members: true } } },
          },
        },
      });

      // Classify each org the caller belongs to.
      const soloOrgIds: string[] = [];
      const blocking: { id: string; name: string }[] = [];
      for (const m of memberships) {
        if (m.organization._count.members === 1) {
          soloOrgIds.push(m.organizationId);
          continue;
        }
        // Shared org — only a *sole owner* blocks (leaving orphans the org).
        if (m.role === OrgRole.OWNER) {
          const ownerCount = await ctx.prisma.organizationMember.count({
            where: { organizationId: m.organizationId, role: OrgRole.OWNER },
          });
          if (ownerCount === 1) {
            blocking.push({ id: m.organizationId, name: m.organization.name });
          }
        }
        // Otherwise the caller simply leaves (membership cascades on delete).
      }

      if (blocking.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: te(ctx.locale, "user.deleteAccountSoleOwnerBlocked"),
          cause: { code: "SOLE_OWNER_BLOCKED", organizations: blocking },
        });
      }

      // Tear down solo-owned orgs first, then the user. Each org is
      // individually all-or-nothing (Stripe cancelled before its rows are
      // touched), and the user is deleted only after every org succeeds. With
      // multiple solo orgs the loop is sequential, so a later failure can leave
      // earlier orgs already gone — but the op is retry-convergent (deleted
      // orgs drop out of `memberships`) and the user is never half-deleted.
      try {
        for (const orgId of soloOrgIds) {
          await deleteOrganizationCascade(orgId);
        }
      } catch (error) {
        if (error instanceof SubscriptionCancelFailedError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: te(ctx.locale, "user.deleteAccountSubscriptionFailed"),
          });
        }
        throw error;
      }

      // Cascades sessions (sign-out), linked accounts, and remaining
      // shared-org / workspace memberships. Log only AFTER it confirms.
      try {
        await ctx.prisma.user.delete({ where: { id: userId } });
      } catch (error) {
        ctx.logger.error(
          { error, userId },
          "User account deletion failed at user.delete"
        );
        throw error;
      }

      ctx.logger.info(
        { userId, deletedOrgs: soloOrgIds.length },
        "User account deleted (self-service)"
      );

      return { success: true };
    }),
});
