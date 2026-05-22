import { TRPCError } from "@trpc/server";
import { hashPassword as hashPasswordScrypt } from "better-auth/crypto";
import { addHours } from "date-fns";

import { comparePassword, hashPassword } from "@/core/auth";

import { auditService } from "@/services/audit.service";
import { CoreEmailService } from "@/services/email/core-email.service";
import { EncryptionService } from "@/services/encryption.service";
import { enqueueNotification } from "@/services/notification/notification-outbox.service";

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
        const expiresAt = addHours(new Date(), 24);

        // Resolve SMTP availability before opening the transaction so we
        // don't hold pg locks across the network call.
        const effectiveEmail = await CoreEmailService.loadEffectiveConfig();

        try {
          // Token write + outbox enqueue commit atomically — neither the
          // token nor the email job persist alone. Stripe-style idempotency
          // (deleteMany + create) lives inside the same tx so a retry that
          // reuses the resetToken collapses on the unique idempotency key.
          await ctx.prisma.$transaction(async (tx) => {
            await tx.passwordReset.deleteMany({
              where: { userId: user.id },
            });
            await tx.passwordReset.create({
              data: {
                userId: user.id,
                token: resetToken,
                expiresAt,
              },
            });

            if (!effectiveEmail.enabled) {
              ctx.logger.warn(
                { userId: user.id },
                "Password reset email skipped — SMTP not enabled"
              );
              return;
            }

            await enqueueNotification(
              {
                channel: "email",
                template: "password_reset",
                target: user.email,
                idempotencyKey: `email:password_reset:${resetToken}`,
                payload: {
                  userName: user.firstName
                    ? `${user.firstName} ${user.lastName}`.trim()
                    : undefined,
                  resetToken,
                  tokenExpiresAt: expiresAt.toISOString(),
                  locale: ctx.locale,
                },
              },
              tx
            );
          });

          if (effectiveEmail.enabled) {
            ctx.logger.info(
              { userId: user.id, email: user.email },
              "Password reset email enqueued"
            );
          }

          // Best-effort audit — split the org lookup from the audit
          // call so that an org-lookup failure doesn't prevent the
          // audit emission (which would lose the event from the Pino
          // mirror too).
          let orgId: string | null = null;
          try {
            const userOrg = await ctx.prisma.organizationMember.findFirst({
              where: { userId: user.id },
              select: { organizationId: true },
            });
            orgId = userOrg?.organizationId ?? null;
          } catch (orgErr) {
            ctx.logger.warn(
              { error: orgErr, userId: user.id },
              "password.reset.requested: org lookup failed; auditing without org"
            );
          }
          try {
            await auditService.logPasswordResetRequest(
              email,
              clientIP,
              userAgent,
              true,
              orgId
            );
          } catch (auditErr) {
            ctx.logger.warn(
              { error: auditErr, userId: user.id },
              "password.reset.requested: audit write failed (non-fatal)"
            );
          }
        } catch (error) {
          ctx.logger.error(
            { error, userId: user.id, email: user.email },
            "Failed to send password reset email"
          );
          // Re-throw so the caller sees the failure: the transaction
          // rolled back (no token persisted) AND/OR the outbox enqueue
          // failed. Returning the success response would tell the user
          // "check your email" while nothing was actually scheduled.
          // Email enumeration safety is preserved on the OK path (we
          // return the same generic message whether the user exists
          // or not at line 56-65 above).
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: te(ctx.locale, "auth.failedToProcessPasswordReset"),
          });
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

        // Best-effort audit — split org lookup from the audit call so
        // org-lookup errors don't suppress the audit emission.
        let resetOrgId: string | null = null;
        try {
          const userOrg = await ctx.prisma.organizationMember.findFirst({
            where: { userId: passwordReset.userId },
            select: { organizationId: true },
          });
          resetOrgId = userOrg?.organizationId ?? null;
        } catch (orgErr) {
          ctx.logger.warn(
            { error: orgErr, userId: passwordReset.userId },
            "password.reset.completed: org lookup failed; auditing without org"
          );
        }
        try {
          await auditService.logPasswordResetCompleted(
            passwordReset.userId,
            passwordReset.user.email,
            clientIP,
            userAgent,
            resetOrgId
          );
        } catch (auditErr) {
          ctx.logger.warn(
            { error: auditErr, userId: passwordReset.userId },
            "password.reset.completed: audit write failed (non-fatal)"
          );
        }

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

        // Best-effort audit — split org lookup from the audit call so
        // resolveOrg failures don't suppress the audit emission.
        let changeOrgId: string | null = null;
        try {
          const orgRes = await ctx.resolveOrg();
          changeOrgId = orgRes?.organizationId ?? null;
        } catch (orgErr) {
          ctx.logger.warn(
            { error: orgErr, userId: user.id },
            "password.changed: org lookup failed; auditing without org"
          );
        }
        try {
          await auditService.logPasswordChange(
            user.id,
            userWithPassword.email,
            clientIP,
            userAgent,
            changeOrgId
          );
        } catch (auditErr) {
          ctx.logger.warn(
            { error: auditErr, userId: user.id },
            "password.changed: audit write failed (non-fatal)"
          );
        }

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
