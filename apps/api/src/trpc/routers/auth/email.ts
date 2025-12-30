import { TRPCError } from "@trpc/server";

import { comparePassword } from "@/core/auth";

import { auditService } from "@/services/audit.service";
import { EmailVerificationService } from "@/services/email/email-verification.service";

import { EmailChangeRequestSchema } from "@/schemas/auth";

import { router, strictRateLimitedProcedure } from "@/trpc/trpc";

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
            firstName: true,
            lastName: true,
          },
        });

        if (!userWithPassword) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Check if user has a password (not OAuth-only user)
        if (!userWithPassword.passwordHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This account uses Google sign-in. Email changes are not available for OAuth accounts.",
          });
        }

        // Verify password
        const isPasswordValid = await comparePassword(
          password,
          userWithPassword.passwordHash
        );

        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Password is incorrect",
          });
        }

        // Check if new email is already in use
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: newEmail },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already in use",
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
            userWithPassword.firstName
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

        // Log email change request for audit
        await auditService.logPasswordEvent({
          action: "email_change_requested",
          userId: user.id,
          email: userWithPassword.email,
          ipAddress: clientIP,
          userAgent: userAgent,
          details: { newEmail },
        });

        return {
          message:
            "Email change requested. Please check your new email to verify the change.",
          pendingEmail: newEmail,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Email change request error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to request email change",
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
        message: "Email change cancelled successfully",
      };
    } catch (error) {
      ctx.logger.error({ error }, "Cancel email change error");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel email change",
      });
    }
  }),
});
