import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UserRole } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { hashPassword } from "@/core/auth";
import { RegisterUserSchema } from "@/schemas/auth";
import { EmailVerificationService } from "@/services/email/email-verification.service";

const registrationController = new Hono();

// User registration
registrationController.post(
  "/register",
  zValidator("json", RegisterUserSchema),
  async (c) => {
    const { email, password, firstName, lastName, workspaceName, acceptTerms } =
      c.req.valid("json");

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return c.json({ error: "Email already in use" }, 400);
      }

      const hashedPassword = await hashPassword(password);

      // Create transaction to handle workspace creation and user registration
      const result = await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            contactEmail: email,
            consentGiven: acceptTerms || false,
            consentDate: acceptTerms ? new Date() : null,
          },
        });
        const workspaceId = workspace.id;

        // Create user (with email verification disabled initially)
        const user = await tx.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            workspaceId,
            role: UserRole.ADMIN, // User is admin of their workspace
            emailVerified: false, // New users must verify their email
            lastLogin: new Date(),
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

        return { user, workspaceId };
      });

      // Generate and send email verification token
      try {
        const verificationToken =
          await EmailVerificationService.generateVerificationToken({
            userId: result.user.id,
            email: result.user.email,
            type: "SIGNUP",
          });

        const emailResult =
          await EmailVerificationService.sendVerificationEmail(
            result.user.email,
            verificationToken,
            "SIGNUP",
            result.user.firstName
          );

        if (!emailResult.success) {
          logger.error(
            { error: emailResult.error },
            "Failed to send verification email during registration"
          );
        }
      } catch (emailError) {
        logger.error(
          { error: emailError },
          "Failed to send verification email during registration"
        );
        // Don't fail the registration if email verification fails
      }

      // Return success without token - user must verify email first
      return c.json(
        {
          message:
            "Registration successful. Please check your email to verify your account before logging in.",
          email: result.user.email,
        },
        201
      );
    } catch (error) {
      logger.error(error, "Registration error");
      return c.json({ error: "Failed to register user" }, 500);
    }
  }
);

export default registrationController;
