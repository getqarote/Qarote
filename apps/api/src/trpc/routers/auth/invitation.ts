import { InvitationStatus, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { OAuth2Client } from "google-auth-library";

import { comparePassword, generateToken, hashPassword } from "@/core/auth";
import { formatInvitedBy } from "@/core/utils";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import {
  AcceptInvitationSchema,
  AcceptInvitationWithGoogleSchema,
  AcceptInvitationWithRegistrationTokenSchema,
  InvitationTokenSchema,
} from "@/schemas/auth";

import { googleConfig } from "@/config";

import { UserMapper } from "@/mappers/auth";
import { WorkspaceMapper } from "@/mappers/workspace";

import { publicProcedure, router } from "@/trpc/trpc";

/**
 * Initialize Google OAuth client
 */
const googleOAuthClient = new OAuth2Client();

/**
 * Invitation router
 * Handles workspace invitation operations
 */
export const invitationRouter = router({
  /**
   * Get invitation details by token (PUBLIC)
   */
  getInvitationDetails: publicProcedure
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
            expiresAt: invitation.expiresAt.toISOString(),
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
   * Accept invitation (PUBLIC)
   */
  acceptInvitation: publicProcedure
    .input(AcceptInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, password, firstName, lastName } = input;

      try {
        // Find invitation by token
        const invitation = await ctx.prisma.invitation.findUnique({
          where: { token },
          include: { workspace: true },
        });

        if (!invitation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid invitation token",
          });
        }

        if (invitation.status !== InvitationStatus.PENDING) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation has already been used or expired",
          });
        }

        const now = new Date();
        if (invitation.expiresAt < now) {
          // Update invitation status to expired
          await ctx.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: InvitationStatus.EXPIRED },
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invitation has expired",
          });
        }

        // Check if user already exists
        let user = await ctx.prisma.user.findUnique({
          where: { email: invitation.email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            role: true,
            workspaceId: true,
            isActive: true,
            emailVerified: true,
            emailVerifiedAt: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        // Security: If user exists, require password verification before changing workspace
        if (user) {
          if (!password) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message:
                "Password is required to accept invitation for existing account",
            });
          }

          // Verify password matches existing user's password
          if (!user.passwordHash) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Account exists but has no password. Please use password reset or Google login.",
            });
          }

          const isPasswordValid = await comparePassword(
            password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid password",
            });
          }
        } else {
          // Validate required fields for new user creation BEFORE transaction
          if (!password || !firstName || !lastName) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Password, first name, and last name are required for new users",
            });
          }
        }

        // Transaction to handle user creation/update and invitation acceptance
        const result = await ctx.prisma.$transaction(async (tx) => {
          if (user) {
            // Update existing user's workspace (password already verified above)
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                workspaceId: invitation.workspaceId,
              },
            });
          } else {
            // Create new user (validation already done above)
            const hashedPassword = await hashPassword(password!);

            user = await tx.user.create({
              data: {
                email: invitation.email,
                passwordHash: hashedPassword,
                firstName: firstName!,
                lastName: lastName!,
                workspaceId: invitation.workspaceId,
                role: UserRole.MEMBER,
                isActive: true,
                emailVerified: true,
                emailVerifiedAt: new Date(),
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
          user: UserMapper.toApiResponse(result),
          token: authToken,
          workspace: invitation.workspace
            ? WorkspaceMapper.toApiResponse(invitation.workspace)
            : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Accept invitation error");
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to accept invitation",
        });
      }
    }),

  /**
   * Accept invitation with registration (PUBLIC)
   */
  acceptInvitationWithRegistration: publicProcedure
    .input(AcceptInvitationWithRegistrationTokenSchema)
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
              role: UserRole.MEMBER,
              workspaceId: invitation.workspaceId,
              isActive: true,
              emailVerified: true,
              emailVerifiedAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              workspaceId: true,
              isActive: true,
              emailVerified: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
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
          user: UserMapper.toApiResponse(newUser),
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
   */
  acceptInvitationWithGoogle: publicProcedure
    .input(AcceptInvitationWithGoogleSchema)
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
            // Update existing user's workspace and link Google OAuth
            user = await tx.user.update({
              where: { id: user.id },
              data: {
                workspaceId: invitation.workspaceId,
                googleId,
                emailVerified: true,
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
                role: UserRole.MEMBER,
                emailVerified: true,
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
          user: UserMapper.toApiResponse(result),
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
