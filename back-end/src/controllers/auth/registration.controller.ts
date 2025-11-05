import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { UserRole } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { hashPassword } from "@/core/auth";
import { RegisterUserSchema } from "@/schemas/auth";
import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";

const registrationController = new Hono();

// User registration
registrationController.post(
  "/register",
  zValidator("json", RegisterUserSchema),
  async (c) => {
    const { email, password, firstName, lastName, acceptTerms } =
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

      // Create user without workspace (workspace will be created later on the dedicated page)
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          // workspaceId is undefined - no workspace assigned yet
          role: UserRole.USER, // Default role until they create/join a workspace
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

      // Generate and send email verification token
      try {
        const verificationToken =
          await EmailVerificationService.generateVerificationToken({
            userId: user.id,
            email: user.email,
            type: "SIGNUP",
          });

        const emailResult =
          await EmailVerificationService.sendVerificationEmail(
            user.email,
            verificationToken,
            "SIGNUP",
            user.firstName
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

      // Create user in Notion (non-blocking)
      try {
        const notionResult = await notionService.createUser({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          role: user.role,
          workspaceId: user.workspaceId,
        });

        if (!notionResult.success) {
          logger.warn(
            { error: notionResult.error, userId: user.id },
            "Failed to create user in Notion during registration"
          );
        } else {
          logger.info(
            { userId: user.id, notionPageId: notionResult.notionPageId },
            "User created in Notion during registration"
          );
        }
      } catch (notionError) {
        logger.error(
          { error: notionError, userId: user.id },
          "Failed to create user in Notion during registration"
        );
        // Don't fail the registration if Notion sync fails
      }

      // Return success without token - user must verify email first
      return c.json(
        {
          message:
            "Registration successful. Please check your email to verify your account before logging in.",
          email: user.email,
        },
        201
      );
    } catch (error) {
      logger.error({ error }, "Registration error");
      return c.json({ error: "Failed to register user" }, 500);
    }
  }
);

export default registrationController;
