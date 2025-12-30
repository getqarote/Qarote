import { TRPCError } from "@trpc/server";

import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";

import { ResendVerificationSchema, VerifyEmailSchema } from "@/schemas/auth";

import { UserMapper } from "@/mappers/auth";

import {
  rateLimitedProcedure,
  rateLimitedPublicProcedure,
  router,
} from "@/trpc/trpc";

/**
 * Verification router
 * Handles email verification
 */
export const verificationRouter = router({
  /**
   * Verify email with token (PUBLIC - RATE LIMITED)
   */
  verifyEmail: rateLimitedPublicProcedure
    .input(VerifyEmailSchema)
    .mutation(async ({ input, ctx }) => {
      const { token } = input;

      try {
        const result = await EmailVerificationService.verifyToken(token);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Invalid verification token",
          });
        }

        // Include updated user info in response
        const updatedUser = await ctx.prisma.user.findUnique({
          where: { id: result.user!.id },
          select: {
            id: true,
            email: true,
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

        // Update user in Notion when email is verified (non-blocking)
        // Fire and forget - don't await to avoid blocking the response
        if (updatedUser && updatedUser.emailVerified) {
          ctx.prisma.user
            .findUnique({
              where: { id: updatedUser.id },
            })
            .then((fullUser) => {
              if (fullUser) {
                return notionService.syncUser(fullUser);
              }
            })
            .catch((notionError) => {
              ctx.logger.warn(
                { notionError, userId: updatedUser.id },
                "Failed to update Notion after email verification"
              );
            });
        }

        if (!updatedUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return {
          message: "Email verified successfully",
          user: UserMapper.toApiResponse(updatedUser),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Email verification error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify email",
        });
      }
    }),

  /**
   * Resend verification email (PUBLIC - supports both authenticated and unauthenticated users)
   * - Authenticated users: uses their account info
   * - Unauthenticated users: requires email to identify the account
   */
  resendVerification: rateLimitedPublicProcedure
    .input(ResendVerificationSchema)
    .mutation(async ({ input, ctx }) => {
      const { type, email: inputEmail } = input;

      try {
        let user;
        let emailToVerify: string;

        // If user is authenticated, use their account
        if (ctx.user) {
          // For EMAIL_CHANGE type, fetch the latest user data from database
          // to ensure we have the most up-to-date pendingEmail value
          if (type === "EMAIL_CHANGE") {
            const dbUser = await ctx.prisma.user.findUnique({
              where: { id: ctx.user.id },
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                emailVerified: true,
                pendingEmail: true,
                isActive: true,
              },
            });

            if (!dbUser) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
              });
            }

            if (!dbUser.pendingEmail) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "No pending email change request found",
              });
            }

            user = dbUser;
            emailToVerify = dbUser.pendingEmail;
          } else {
            // For other types (SIGNUP), use ctx.user directly
            user = ctx.user;
            emailToVerify = user.email;
          }

          if (!emailToVerify) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No email to verify",
            });
          }
        } else {
          // Unauthenticated: require email to identify the user
          if (!inputEmail) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Email is required for unauthenticated requests",
            });
          }

          // EMAIL_CHANGE type requires authentication
          if (type === "EMAIL_CHANGE") {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Email change verification requires authentication",
            });
          }

          // Find user by email
          const foundUser = await ctx.prisma.user.findUnique({
            where: { email: inputEmail },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              emailVerified: true,
              pendingEmail: true,
              isActive: true,
            },
          });

          if (!foundUser) {
            // Don't reveal if email exists for security
            ctx.logger.warn(
              { email: inputEmail },
              "Resend verification requested for non-existent email"
            );
            // Return success message even if user doesn't exist (security best practice)
            return {
              message:
                "If an account exists with this email, a verification email has been sent",
            };
          }

          // Check if user is already verified (for SIGNUP type)
          if (type === "SIGNUP" && foundUser.emailVerified) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Email is already verified",
            });
          }

          // Check if user is active
          if (!foundUser.isActive) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Account is inactive",
            });
          }

          user = foundUser;
          // For unauthenticated SIGNUP requests, always verify the primary email
          emailToVerify = foundUser.email;
        }

        // Generate and send verification token
        const verificationToken =
          await EmailVerificationService.generateVerificationToken({
            userId: user.id,
            email: emailToVerify,
            type,
          });

        const emailResult =
          await EmailVerificationService.sendVerificationEmail(
            emailToVerify,
            verificationToken,
            type,
            user.firstName || undefined
          );

        if (!emailResult.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send verification email",
          });
        }

        // For unauthenticated requests, return generic message for security
        if (!ctx.user) {
          return {
            message:
              "If an account exists with this email, a verification email has been sent",
          };
        }

        return {
          message: "Verification email sent successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Resend verification error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resend verification email",
        });
      }
    }),

  /**
   * Get verification status (PROTECTED)
   */
  getVerificationStatus: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    try {
      const fullUser = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          emailVerified: true,
          emailVerifiedAt: true,
          pendingEmail: true,
        },
      });

      if (!fullUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        emailVerified: fullUser.emailVerified,
        emailVerifiedAt: fullUser.emailVerifiedAt,
        pendingEmail: fullUser.pendingEmail,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      ctx.logger.error({ error }, "Error fetching verification status");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch verification status",
      });
    }
  }),
});
