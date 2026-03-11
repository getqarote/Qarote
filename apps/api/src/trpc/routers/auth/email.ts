import { TRPCError } from "@trpc/server";

import { comparePassword } from "@/core/auth";

import { auditService } from "@/services/audit.service";
import { EmailVerificationService } from "@/services/email/email-verification.service";

import { EmailChangeRequestSchema } from "@/schemas/auth";

import { router, strictRateLimitedProcedure } from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Email router
 * Handles email change operations
 */
export const emailRouter = router({
  /**
   * Request email change (PROTECTED - STRICT RATE LIMITED)
   */
  requestEmailChange: strictRateLimitedProcedure
    .input(EmailChangeRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { newEmail, password } = input;
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
            firstName: true,
            lastName: true,
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
            message: te(ctx.locale, "auth.googleSignInNoEmailChange"),
          });
        }

        const isPasswordValid = await comparePassword(password, passwordHash);

        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: te(ctx.locale, "auth.passwordIsIncorrect"),
          });
        }

        // Check if new email is already in use
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: newEmail },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.emailAlreadyInUse"),
          });
        }

        // Set pending email
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { pendingEmail: newEmail },
        });

        // Generate verification token
        const verificationToken =
          await EmailVerificationService.generateVerificationToken({
            userId: user.id,
            email: newEmail,
            type: "EMAIL_CHANGE",
          });

        // Send verification email
        const emailResult =
          await EmailVerificationService.sendVerificationEmail(
            newEmail,
            verificationToken,
            "EMAIL_CHANGE",
            userWithPassword.firstName,
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
            message: te(ctx.locale, "auth.failedToSendVerificationEmail"),
          });
        }

        await auditService.logPasswordEvent({
          action: "email_change_requested",
          userId: user.id,
          email: userWithPassword.email,
          ipAddress: clientIP,
          userAgent: userAgent,
          details: { newEmail },
        });

        return {
          message: te(ctx.locale, "messages.emailChangeRequested"),
          pendingEmail: newEmail,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Email change request error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToRequestEmailChange"),
        });
      }
    }),

  /**
   * Cancel email change (PROTECTED - STRICT RATE LIMITED)
   */
  cancelEmailChange: strictRateLimitedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user;

    try {
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { pendingEmail: null },
      });

      return {
        message: te(ctx.locale, "messages.emailChangeCancelled"),
      };
    } catch (error) {
      ctx.logger.error({ error }, "Cancel email change error");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: te(ctx.locale, "auth.failedToCancelEmailChange"),
      });
    }
  }),
});
