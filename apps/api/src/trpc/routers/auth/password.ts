import { TRPCError } from "@trpc/server";

import { comparePassword, hashPassword } from "@/core/auth";

import { auditService } from "@/services/audit.service";
import { passwordResetEmailService } from "@/services/email/password-reset-email.service";
import { EncryptionService } from "@/services/encryption.service";

import {
  PasswordChangeSchema,
  PasswordResetRequestSchema,
  PasswordResetSchema,
} from "@/schemas/auth";

import { isDevelopment } from "@/config";

import {
  rateLimitedPublicProcedure,
  router,
  strictRateLimitedProcedure,
} from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Password router
 * Handles password reset and change operations
 */
export const passwordRouter = router({
  /**
   * Request password reset (PUBLIC - RATE LIMITED)
   */
  requestPasswordReset: rateLimitedPublicProcedure
    .input(PasswordResetRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;
      // Note: IP and user agent tracking would need to be added to context if needed
      const clientIP = "unknown";
      const userAgent = "unknown";

      try {
        // Find user by email
        const user = await ctx.prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        if (!user) {
          // Log failed attempt for audit
          await auditService.logPasswordResetRequest(
            email,
            clientIP,
            userAgent,
            false
          );

          // Return success even if user doesn't exist for security
          return {
            message: te(ctx.locale, "messages.passwordResetEmailSent"),
          };
        }

        // Generate a reset token and set expiration (24 hours from now)
        const resetToken = EncryptionService.generateEncryptionKey();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Clean up any existing password reset requests for this user
        await ctx.prisma.passwordReset.deleteMany({
          where: { userId: user.id },
        });

        // Store the new token in the database
        await ctx.prisma.passwordReset.create({
          data: {
            userId: user.id,
            token: resetToken,
            expiresAt,
          },
        });

        // Send password reset email
        try {
          await passwordResetEmailService.sendPasswordResetEmail(
            user.email,
            resetToken,
            user.firstName
              ? `${user.firstName} ${user.lastName}`.trim()
              : undefined,
            ctx.locale
          );
          ctx.logger.info(
            { userId: user.id, email: user.email },
            "Password reset email sent successfully"
          );

          // Log successful request for audit
          await auditService.logPasswordResetRequest(
            email,
            clientIP,
            userAgent,
            true
          );
        } catch (emailError) {
          ctx.logger.error(
            { emailError, userId: user.id, email: user.email },
            "Failed to send password reset email"
          );
          // Don't fail the request if email sending fails
          // The token is still valid in the database
        }

        return {
          message: te(ctx.locale, "messages.passwordResetEmailSent"),
          // Only return token in development for testing
          ...(isDevelopment() ? { token: resetToken } : {}),
        };
      } catch (error) {
        ctx.logger.error({ error }, "Password reset request error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToProcessPasswordReset"),
        });
      }
    }),

  /**
   * Reset password using token (PUBLIC - RATE LIMITED)
   */
  resetPassword: rateLimitedPublicProcedure
    .input(PasswordResetSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, password } = input;
      // Note: IP and user agent tracking would need to be added to context if needed
      const clientIP = "unknown";
      const userAgent = "unknown";

      try {
        // Find the password reset record
        const passwordReset = await ctx.prisma.passwordReset.findUnique({
          where: { token },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (!passwordReset) {
          await auditService.logPasswordResetFailed(
            token,
            "Invalid token",
            clientIP,
            userAgent
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.invalidOrExpiredResetToken"),
          });
        }

        // Check if token is expired
        if (passwordReset.expiresAt < new Date()) {
          // Clean up expired token
          await ctx.prisma.passwordReset.delete({
            where: { id: passwordReset.id },
          });
          await auditService.logPasswordResetFailed(
            token,
            "Expired token",
            clientIP,
            userAgent
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.resetTokenExpired"),
          });
        }

        // Check if token has already been used
        if (passwordReset.used) {
          await auditService.logPasswordResetFailed(
            token,
            "Token already used",
            clientIP,
            userAgent
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.resetTokenAlreadyUsed"),
          });
        }

        // Hash the new password
        const hashedPassword = await hashPassword(password);

        // Update user password and mark token as used
        await ctx.prisma.$transaction([
          ctx.prisma.user.update({
            where: { id: passwordReset.userId },
            data: { passwordHash: hashedPassword },
          }),
          ctx.prisma.passwordReset.update({
            where: { id: passwordReset.id },
            data: { used: true },
          }),
        ]);

        ctx.logger.info(
          { userId: passwordReset.userId, email: passwordReset.user.email },
          "Password reset successfully completed"
        );

        // Log successful password reset for audit
        await auditService.logPasswordResetCompleted(
          passwordReset.userId,
          passwordReset.user.email,
          clientIP,
          userAgent
        );

        return { message: te(ctx.locale, "messages.passwordResetSuccess") };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Password reset error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToResetPassword"),
        });
      }
    }),

  /**
   * Change password (authenticated - STRICT RATE LIMITED)
   */
  changePassword: strictRateLimitedProcedure
    .input(PasswordChangeSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentPassword, newPassword } = input;
      const user = ctx.user;
      // Note: IP and user agent tracking would need to be added to context if needed
      const clientIP = "unknown";
      const userAgent = "unknown";

      try {
        // Get user with password hash
        const userWithPassword = await ctx.prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            passwordHash: true,
          },
        });

        if (!userWithPassword) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: te(ctx.locale, "auth.userNotFound"),
          });
        }

        // Check if user has a password (not OAuth-only user)
        if (!userWithPassword.passwordHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.googleSignInNoPasswordChange"),
          });
        }

        // Verify current password
        const isPasswordValid = await comparePassword(
          currentPassword,
          userWithPassword.passwordHash
        );

        if (!isPasswordValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.currentPasswordIncorrect"),
          });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashedPassword },
        });

        // Log password change for audit
        await auditService.logPasswordChange(
          user.id,
          userWithPassword.email,
          clientIP,
          userAgent
        );

        return { message: te(ctx.locale, "messages.passwordUpdatedSuccess") };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Password change error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToChangePassword"),
        });
      }
    }),
});
