import { TRPCError } from "@trpc/server";
import { OAuth2Client } from "google-auth-library";

import { generateToken, hashPassword } from "@/core/auth";
import { formatInvitedBy } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import {
  AcceptInvitationWithRegistrationSchema,
  GoogleInvitationAcceptSchema,
  InvitationTokenSchema,
} from "@/schemas/auth";

import { googleConfig } from "@/config";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import { InvitationStatus, UserRole } from "@/generated/prisma/client";

/**
 * Initialize Google OAuth client
 */
const googleOAuthClient = new OAuth2Client();

/**
 * Public invitation router
 * Handles public invitation operations (no authentication required)
 */
export const publicInvitationRouter = router({
  /**
   * Get invitation details by token (PUBLIC)
   * GET /invitations/:token
   */
  getDetails: rateLimitedPublicProcedure
    .input(InvitationTokenSchema)
    .query(async ({ input, ctx }) => {
      const { token } = input;

      try {
        const invitation = await ctx.prisma.invitation.findFirst({
          where: {
            token,
            status: InvitationStatus.PENDING,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
                ownerId: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid or expired invitation",
          });
        }

        // Get workspace owner's subscription to determine plan
        const ownerSubscription = await ctx.prisma.subscription.findUnique({
          where: { userId: invitation.workspace.ownerId! },
          select: { plan: true },
        });

        if (!ownerSubscription) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Workspace owner has no active subscription",
          });
        }

        return {
          success: true,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            expiresAt: invitation.expiresAt,
            workspace: {
              id: invitation.workspace.id,
              name: invitation.workspace.name,
              contactEmail: invitation.workspace.contactEmail,
              plan: ownerSubscription.plan,
            },
            invitedBy: formatInvitedBy(invitation.invitedBy),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error fetching invitation details");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch invitation details",
        });
      }
    }),

  /**
   * Accept invitation with registration (PUBLIC)
   * POST /invitations/:token/accept
   */
  accept: rateLimitedPublicProcedure
    .input(InvitationTokenSchema.merge(AcceptInvitationWithRegistrationSchema))
    .mutation(async ({ input, ctx }) => {
      const { token, password, firstName, lastName } = input;

      try {
        const invitation = await ctx.prisma.invitation.findFirst({
          where: {
            token,
            status: InvitationStatus.PENDING,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid or expired invitation",
          });
        }

        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: invitation.email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User with this email already exists",
          });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await ctx.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: invitation.email,
              passwordHash: hashedPassword,
              firstName,
              lastName,
              role: UserRole.MEMBER, // Default global role - workspace-specific role is in WorkspaceMember
              workspaceId: invitation.workspaceId,
              isActive: true,
              emailVerified: true, // Auto-verify since they came from invitation
            },
          });

          // Add user to WorkspaceMember table
          await ensureWorkspaceMember(
            user.id,
            invitation.workspaceId,
            invitation.role,
            tx
          );

          // Update invitation status
          await tx.invitation.update({
            where: { id: invitation.id },
            data: {
              status: InvitationStatus.ACCEPTED,
              invitedUserId: user.id,
            },
          });

          return user;
        });

        const jwtToken = await generateToken({
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          workspaceId: newUser.workspaceId,
        });

        return {
          message: "Invitation accepted successfully",
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            workspaceId: newUser.workspaceId,
          },
          workspace: {
            id: invitation.workspace.id,
            name: invitation.workspace.name,
          },
          token: jwtToken,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error accepting invitation");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept invitation",
        });
      }
    }),

  /**
   * Accept invitation with Google OAuth (PUBLIC)
   * POST /invitations/:token/accept-google
   */
  acceptWithGoogle: rateLimitedPublicProcedure
    .input(InvitationTokenSchema.merge(GoogleInvitationAcceptSchema))
    .mutation(async ({ input, ctx }) => {
      const { token, credential } = input;

      try {
        // Verify the Google OAuth token
        if (!googleConfig.clientId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Google OAuth client ID not configured",
          });
        }

        const ticket = await googleOAuthClient.verifyIdToken({
          idToken: credential,
          audience: googleConfig.clientId,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid Google token",
          });
        }

        const { sub: googleId, email, given_name, family_name } = payload;

        if (!email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email not provided by Google",
          });
        }

        // Find the invitation
        const invitation = await ctx.prisma.invitation.findFirst({
          where: {
            token,
            status: InvitationStatus.PENDING,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid or expired invitation",
          });
        }

        // Verify that the Google email matches the invitation email
        if (email.toLowerCase() !== invitation.email.toLowerCase()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Google account email does not match invitation email",
          });
        }

        // Check if user already exists
        let user = await ctx.prisma.user.findUnique({
          where: { email: invitation.email },
        });

        const isNewUser = !user;

        // Transaction to handle user creation/update and invitation acceptance
        const result = await ctx.prisma.$transaction(async (tx) => {
          if (user) {
            // Update existing user's workspace and link Google OAuth (but NOT their global role)
            // The workspace-specific role is stored in WorkspaceMember.role
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                workspaceId: invitation.workspaceId,
                // Do NOT update User.role - it's for global admin access only
                // Workspace-specific role is stored in WorkspaceMember.role
                googleId,
                emailVerified: true, // Google emails are verified
                emailVerifiedAt: new Date(),
                lastLogin: new Date(),
              },
            });
          } else {
            // Create new user with Google OAuth
            user = await tx.user.create({
              data: {
                email: invitation.email,
                firstName: given_name || "",
                lastName: family_name || "",
                googleId,
                workspaceId: invitation.workspaceId,
                role: UserRole.MEMBER, // Default global role - workspace-specific role is in WorkspaceMember
                emailVerified: true, // Google emails are verified
                emailVerifiedAt: new Date(),
                isActive: true,
                lastLogin: new Date(),
              },
            });
          }

          // Add user to WorkspaceMember table
          await ensureWorkspaceMember(
            user.id,
            invitation.workspaceId,
            invitation.role,
            tx
          );

          // Update invitation status
          await tx.invitation.update({
            where: { id: invitation.id },
            data: {
              status: InvitationStatus.ACCEPTED,
              invitedUserId: user.id,
            },
          });

          return user;
        });

        // Generate JWT token
        const authToken = await generateToken({
          id: result.id,
          email: result.email,
          role: result.role,
          workspaceId: result.workspaceId,
        });

        return {
          message: "Invitation accepted successfully with Google",
          user: {
            id: result.id,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            role: result.role,
            workspaceId: result.workspaceId,
            googleId: result.googleId,
            emailVerified: result.emailVerified,
          },
          workspace: {
            id: invitation.workspace.id,
            name: invitation.workspace.name,
          },
          token: authToken,
          isNewUser,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Error accepting invitation with Google");
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept invitation with Google",
        });
      }
    }),
});
