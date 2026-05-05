import { TRPCError } from "@trpc/server";

import { hashPassword } from "@/core/auth";

import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";
import { posthog } from "@/services/posthog";
import { trackSignUpError } from "@/services/sentry";
import { StripeCustomerService } from "@/services/stripe/customer.service";
import {
  turnstileEnabled,
  verifyTurnstileToken,
} from "@/services/turnstile/turnstile.service";

import { RegisterUserSchema } from "@/schemas/auth";

import { emailConfig, registrationConfig } from "@/config";
import { isCloudMode } from "@/config/deployment";

import { UserMapper } from "@/mappers/auth";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

import { te } from "@/i18n";

/**
 * Registration router
 * Handles user registration with custom business logic (Stripe trials, Notion sync, etc.)
 * Note: This is kept as a tRPC mutation rather than using better-auth's signUp endpoint
 * because of the extensive custom logic (registration toggle, terms acceptance, email
 * verification via our own service, Stripe trial provisioning, Notion sync).
 */
export const registrationRouter = router({
  /**
   * Register new user (PUBLIC - RATE LIMITED)
   */
  register: rateLimitedPublicProcedure
    .input(RegisterUserSchema)
    .mutation(async ({ input, ctx }) => {
      const {
        email,
        password,
        firstName,
        lastName,
        acceptTerms,
        sourceApp,
        referralSource,
        discoveryQuery,
      } = input;

      // Check if public registration is enabled
      if (!registrationConfig.enabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: te(ctx.locale, "auth.registrationDisabled"),
        });
      }

      // Verify Cloudflare Turnstile token when configured
      if (turnstileEnabled) {
        if (!input.turnstileToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.captchaRequired"),
          });
        }
        const ok = await verifyTurnstileToken(
          input.turnstileToken,
          ctx.remoteIp ?? undefined
        );
        if (!ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: te(ctx.locale, "auth.captchaVerificationFailed"),
          });
        }
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

        // Create user and Account record in a transaction
        const user = await ctx.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              passwordHash: hashedPassword,
              firstName,
              lastName,
              name: `${firstName} ${lastName}`.trim(),
              ...(autoVerify && {
                emailVerified: true,
                emailVerifiedAt: new Date(),
              }),
              ...(referralSource && { referralSource }),
              ...(discoveryQuery && { discoveryQuery }),
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

          // Create better-auth Account record for credential-based auth
          await tx.account.create({
            data: {
              userId: newUser.id,
              accountId: newUser.id,
              providerId: "credential",
              password: hashedPassword,
            },
          });

          return newUser;
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

        try {
          posthog?.identify({
            distinctId: user.id,
            properties: {
              $set: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
              $set_once: { first_registered_at: user.createdAt },
            },
          });
          posthog?.capture({
            distinctId: user.id,
            event: "user_registered",
            properties: {
              auto_verified: autoVerify,
              source_app: sourceApp ?? null,
            },
          });
        } catch (analyticsError) {
          ctx.logger.warn(
            { error: analyticsError, userId: user.id },
            "PostHog registration tracking failed"
          );
        }

        // Update user in Notion (non-blocking)
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
