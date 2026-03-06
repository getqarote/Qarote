import { TRPCError } from "@trpc/server";

import { hashPassword } from "@/core/auth";

import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";
import { trackSignUpError } from "@/services/sentry";
import { StripeCustomerService } from "@/services/stripe/customer.service";

import { RegisterUserSchema } from "@/schemas/auth";

import { emailConfig, registrationConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { UserMapper } from "@/mappers/auth";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Registration router
 * Handles user registration
 */
export const registrationRouter = router({
  /**
   * Register new user (PUBLIC - RATE LIMITED)
   */
  register: rateLimitedPublicProcedure
    .input(RegisterUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, firstName, lastName, acceptTerms, sourceApp } =
        input;

      // Check if public registration is enabled
      if (!registrationConfig.enabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: te(ctx.locale, "auth.registrationDisabled"),
        });
      }

      // Validate that terms were accepted
      if (!acceptTerms) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: te(ctx.locale, "auth.mustAcceptTerms"),
        });
      }

      try {
        // Check if user already exists
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          trackSignUpError("email_exists", { email });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.emailAlreadyInUse"),
          });
        }

        const hashedPassword = await hashPassword(password);

        // When email is disabled (default for community/binary deployments),
        // auto-verify the user so they can log in immediately.
        const autoVerify = !emailConfig.enabled;

        // Create user without workspace (workspace will be created later on the dedicated page)
        const user = await ctx.prisma.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            // workspaceId is undefined - no workspace assigned yet
            ...(autoVerify && {
              emailVerified: true,
              emailVerifiedAt: new Date(),
            }),
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

        // Auto-start Enterprise trial for cloud users (fire-and-forget)
        if (isCloudMode()) {
          StripeCustomerService.provisionTrialForNewUser({
            userId: user.id,
            email,
            name: `${firstName} ${lastName}`.trim(),
            prisma: ctx.prisma,
          }).catch((error) => {
            ctx.logger.warn(
              { error, userId: user.id },
              "Failed to auto-start trial at registration"
            );
          });
        }

        // Generate verification token and send email (skip if email is disabled)
        if (!autoVerify) {
          try {
            const verificationToken =
              await EmailVerificationService.generateVerificationToken({
                userId: user.id,
                email: user.email,
                type: "SIGNUP",
              });

            await EmailVerificationService.sendVerificationEmail(
              user.email,
              verificationToken,
              "SIGNUP",
              firstName,
              sourceApp,
              ctx.locale
            );

            ctx.logger.info(
              { userId: user.id, email: user.email },
              "Verification email sent successfully"
            );
          } catch (error) {
            ctx.logger.error(
              { error, userId: user.id },
              "Failed to send verification email"
            );
            // Don't fail registration if email sending fails
          }
        }

        // Update user in Notion (non-blocking)
        // Fire and forget - don't await to avoid blocking the response
        ctx.prisma.user
          .findUnique({
            where: { id: user.id },
          })
          .then((fullUser) => {
            if (fullUser) {
              return notionService.syncUser(fullUser);
            }
          })
          .catch((notionError) => {
            ctx.logger.warn(
              { notionError, userId: user.id },
              "Failed to update Notion"
            );
          });

        return {
          message: autoVerify
            ? "Registration successful. You can now sign in."
            : "Registration successful. Please check your email to verify your account.",
          user: UserMapper.toApiResponse(user),
          autoVerified: autoVerify,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Registration error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: te(ctx.locale, "auth.failedToRegister"),
        });
      }
    }),
});
