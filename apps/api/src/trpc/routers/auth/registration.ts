import { TRPCError } from "@trpc/server";

import { hashPassword } from "@/core/auth";

import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";
import { trackSignUpError } from "@/services/sentry";

import { RegisterUserSchema } from "@/schemas/auth";

import { UserMapper } from "@/mappers/auth";

import { rateLimitedPublicProcedure, router } from "@/trpc/trpc";

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

      // Validate that terms were accepted
      if (!acceptTerms) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must accept the terms of service to register",
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
            message: "Email already in use",
          });
        }

        const hashedPassword = await hashPassword(password);

        // Create user without workspace (workspace will be created later on the dedicated page)
        const user = await ctx.prisma.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            // workspaceId is undefined - no workspace assigned yet
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

        // Generate verification token and send email
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
            sourceApp
          );

          ctx.logger.info(
            { userId: user.id, email: user.email },
            "Verification email sent successfully"
          );
        } catch (emailError) {
          ctx.logger.error(
            { emailError, userId: user.id },
            "Failed to send verification email"
          );
          // Don't fail registration if email sending fails
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
          message:
            "Registration successful. Please check your email to verify your account.",
          user: UserMapper.toApiResponse(user),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        ctx.logger.error({ error }, "Registration error");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to register user",
        });
      }
    }),
});
