import { TRPCError } from "@trpc/server";
import { hashPassword as hashPasswordScrypt } from "better-auth/crypto";

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
 * Handles password reset and change operations.
 * Updates both User.passwordHash (legacy) and Account.password (better-auth)
 * to keep them in sync during the transition period.
 */
export const passwordRouter = router({
  /**
   * Request password reset (PUBLIC - RATE LIMITED)
   */
  requestPasswordReset: rateLimitedPublicProcedure
    .input(PasswordResetRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { email } = input;
      const clientIP = "unknown";
      const userAgent = "unknown";

      try {
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
          await auditService.logPasswordResetRequest(
            email,
            clientIP,
            userAgent,
            false
          );
          return {
            message: te(ctx.locale, "messages.passwordResetEmailSent"),
          };
        }

        const resetToken = EncryptionService.generateEncryptionKey();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await ctx.prisma.passwordReset.deleteMany({
          where: { userId: user.id },
        });

        await ctx.prisma.passwordReset.create({
          data: {
            userId: user.id,
            token: resetToken,
            expiresAt,
          },
        });

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
        }

        return {
          message: te(ctx.locale, "messages.passwordResetEmailSent"),
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
      const clientIP = "unknown";
      const userAgent = "unknown";

      try {
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

        if (passwordReset.expiresAt < new Date()) {
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

        // Hash with bcrypt for legacy User.passwordHash, scrypt for better-auth Account.password
        const [hashedPassword, scryptHash] = await Promise.all([
          hashPassword(password),
          hashPasswordScrypt(password),
        ]);

        // Update both User.passwordHash and Account.password (better-auth)
        // Use upsert for Account to handle users who don't have a credential account yet
        await ctx.prisma.$transaction([
          ctx.prisma.user.update({
            where: { id: passwordReset.userId },
            data: { passwordHash: hashedPassword },
          }),
          ctx.prisma.account.upsert({
            where: {
              providerId_accountId: {
                providerId: "credential",
                accountId: passwordReset.userId,
              },
            },
            update: { password: scryptHash },
            create: {
              userId: passwordReset.userId,
              accountId: passwordReset.userId,
              providerId: "credential",
              password: scryptHash,
            },
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
      const clientIP = "unknown";
      const userAgent = "unknown";

      try {
        // Check Account table first (better-auth), fall back to User.passwordHash
        const account = await ctx.prisma.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
          select: { password: true },
        });

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

        const passwordHash = account?.password || userWithPassword.passwordHash;

        if (!passwordHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.googleSignInNoPasswordChange"),
          });
        }

        const isPasswordValid = await comparePassword(
          currentPassword,
          passwordHash
        );

        if (!isPasswordValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.currentPasswordIncorrect"),
          });
        }

        // Hash with bcrypt for legacy User.passwordHash, scrypt for better-auth Account.password
        const [hashedPassword, scryptHash] = await Promise.all([
          hashPassword(newPassword),
          hashPasswordScrypt(newPassword),
        ]);

        // Update both User.passwordHash and Account.password
        // Use upsert for Account to handle users who don't have a credential account yet
        await ctx.prisma.$transaction([
          ctx.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword },
          }),
          ctx.prisma.account.upsert({
            where: {
              providerId_accountId: {
                providerId: "credential",
                accountId: user.id,
              },
            },
            update: { password: scryptHash },
            create: {
              userId: user.id,
              accountId: user.id,
              providerId: "credential",
              password: scryptHash,
            },
          }),
        ]);

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
