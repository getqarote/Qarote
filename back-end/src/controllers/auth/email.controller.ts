import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { authenticate, comparePassword } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { auditService } from "@/services/audit.service";
import { EmailVerificationService } from "@/services/email/email-verification.service";

import { strictRateLimiter } from "@/middlewares/rateLimiter";

import { EmailChangeRequestSchema } from "@/schemas/auth";

const emailController = new Hono();

// Request email change (authenticated)
emailController.post(
  "/email-change/request",
  authenticate,
  strictRateLimiter,
  zValidator("json", EmailChangeRequestSchema),
  async (c) => {
    const { newEmail, password } = c.req.valid("json");
    const user = c.get("user");
    const clientIP =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      // Get user with password hash
      const userWithPassword = await prisma.user.findUnique({
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
        return c.json({ error: "User not found" }, 404);
      }

      // Check if user has a password (not OAuth-only user)
      if (!userWithPassword.passwordHash) {
        return c.json(
          {
            error:
              "This account uses Google sign-in. Email changes are not available for OAuth accounts.",
          },
          400
        );
      }

      // Verify current password
      const isPasswordValid = await comparePassword(
        password,
        userWithPassword.passwordHash
      );

      if (!isPasswordValid) {
        await auditService.logPasswordEvent({
          action: "email_change_failed",
          userId: user.id,
          email: userWithPassword.email,
          ipAddress: clientIP,
          userAgent,
          details: {
            reason: "invalid_password",
            newEmail: newEmail.substring(0, 3) + "***",
          },
        });
        return c.json({ error: "Password is incorrect" }, 400);
      }

      // Check if the new email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email: newEmail },
      });

      if (existingUser) {
        await auditService.logPasswordEvent({
          action: "email_change_failed",
          userId: user.id,
          email: userWithPassword.email,
          ipAddress: clientIP,
          userAgent,
          details: {
            reason: "email_already_exists",
            newEmail: newEmail.substring(0, 3) + "***",
          },
        });
        return c.json({ error: "This email address is already in use" }, 400);
      }

      // Check if user is trying to change to the same email
      if (newEmail === userWithPassword.email) {
        return c.json(
          { error: "New email must be different from current email" },
          400
        );
      }

      // Store the pending email change
      await prisma.user.update({
        where: { id: user.id },
        data: { pendingEmail: newEmail },
      });

      // Send verification email to the new email address
      try {
        // First generate a verification token
        const token = await EmailVerificationService.generateVerificationToken({
          userId: user.id,
          email: newEmail,
          type: "EMAIL_CHANGE",
        });

        const result = await EmailVerificationService.sendVerificationEmail(
          newEmail,
          token,
          "EMAIL_CHANGE",
          userWithPassword.firstName
        );

        if (!result.success) {
          return c.json({ error: result.error }, 400);
        }

        // Log successful email change request
        await auditService.logPasswordEvent({
          action: "email_change_requested",
          userId: user.id,
          email: userWithPassword.email,
          ipAddress: clientIP,
          userAgent,
          details: { newEmail: newEmail.substring(0, 3) + "***" },
        });

        return c.json({
          message:
            "Verification email sent to your new email address. Please check your inbox and click the verification link to complete the email change.",
          pendingEmail: newEmail,
        });
      } catch (emailError) {
        logger.error(
          { emailError, userId: user.id, newEmail },
          "Failed to send email change verification email"
        );
        return c.json({ error: "Failed to send verification email" }, 500);
      }
    } catch (error) {
      logger.error({ error }, "Email change request error");
      return c.json({ error: "Failed to process email change request" }, 500);
    }
  }
);

// Cancel email change request (authenticated)
emailController.post("/email-change/cancel", authenticate, async (c) => {
  const user = c.get("user");
  const clientIP =
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";

  try {
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        pendingEmail: true,
      },
    });

    if (!userInfo?.pendingEmail) {
      return c.json({ error: "No pending email change found" }, 400);
    }

    // Clear the pending email and remove verification tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { pendingEmail: null },
      }),
      prisma.emailVerificationToken.deleteMany({
        where: {
          userId: user.id,
          type: "EMAIL_CHANGE",
        },
      }),
    ]);

    // Log email change cancellation
    await auditService.logPasswordEvent({
      action: "email_change_cancelled",
      userId: user.id,
      email: userInfo.email,
      ipAddress: clientIP,
      userAgent,
      details: {
        cancelledEmail: userInfo.pendingEmail.substring(0, 3) + "***",
      },
    });

    return c.json({ message: "Email change request cancelled successfully" });
  } catch (error) {
    logger.error({ error }, "Email change cancellation error");
    return c.json({ error: "Failed to cancel email change request" }, 500);
  }
});

export default emailController;
