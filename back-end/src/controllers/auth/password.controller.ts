import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { hashPassword, comparePassword, authenticate } from "@/core/auth";
import {
  PasswordResetRequestSchema,
  PasswordResetSchema,
  PasswordChangeSchema,
} from "@/schemas/auth";
import { EncryptionService } from "@/services/encryption.service";
import { isDevelopment } from "@/config";
import { strictRateLimiter } from "@/middlewares/security";
import { passwordResetEmailService } from "@/services/email/password-reset-email.service";
import { auditService } from "@/services/audit.service";

const passwordController = new Hono();

// Password reset request (not authenticated)
passwordController.post(
  "/password-reset/request",
  zValidator("json", PasswordResetRequestSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    const clientIP =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        // Log failed attempt for audit
        await auditService.logPasswordResetRequest(
          email,
          clientIP,
          userAgent,
          false
        );

        // Return success even if user doesn't exist for security
        return c.json({
          message:
            "If your email is registered, you will receive a password reset link",
        });
      }

      // Generate a reset token and set expiration (24 hours from now)
      const resetToken = EncryptionService.generateEncryptionKey();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Clean up any existing password reset requests for this user
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id },
      });

      // Store the new token in the database
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });

      // Send password reset email
      try {
        await passwordResetEmailService.sendPasswordResetEmail(
          user.email,
          resetToken,
          user.firstName
            ? `${user.firstName} ${user.lastName}`.trim()
            : undefined
        );
        logger.info(
          { userId: user.id, email: user.email },
          "Password reset email sent successfully"
        );

        // Log successful request for audit
        await auditService.logPasswordResetRequest(
          email,
          clientIP,
          userAgent,
          true
        );
      } catch (emailError) {
        logger.error(
          { emailError, userId: user.id, email: user.email },
          "Failed to send password reset email"
        );
        // Don't fail the request if email sending fails
        // The token is still valid in the database
      }

      return c.json({
        message:
          "If your email is registered, you will receive a password reset link",
        // Only return token in development for testing
        ...(isDevelopment() ? { token: resetToken } : {}),
      });
    } catch (error) {
      logger.error({ error }, "Password reset request error");
      return c.json({ error: "Failed to process password reset request" }, 500);
    }
  }
);

// Password reset (not authenticated)
passwordController.post(
  "/password-reset",
  zValidator("json", PasswordResetSchema),
  async (c) => {
    const { token, password } = c.req.valid("json");
    const clientIP =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";

    try {
      // Find the password reset record
      const passwordReset = await prisma.passwordReset.findUnique({
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
        return c.json(
          { error: "Invalid or expired password reset token" },
          400
        );
      }

      // Check if token is expired
      if (passwordReset.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.passwordReset.delete({
          where: { id: passwordReset.id },
        });
        await auditService.logPasswordResetFailed(
          token,
          "Expired token",
          clientIP,
          userAgent
        );
        return c.json({ error: "Password reset token has expired" }, 400);
      }

      // Check if token has already been used
      if (passwordReset.used) {
        await auditService.logPasswordResetFailed(
          token,
          "Token already used",
          clientIP,
          userAgent
        );
        return c.json(
          { error: "Password reset token has already been used" },
          400
        );
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);

      // Update user password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: passwordReset.userId },
          data: { passwordHash: hashedPassword },
        }),
        prisma.passwordReset.update({
          where: { id: passwordReset.id },
          data: { used: true },
        }),
      ]);

      logger.info(
        { userId: passwordReset.userId, email: passwordReset.user.email },
        "Password reset successfully completed"
      );

      // Log successful password reset for audit
      await auditService.logPasswordResetCompleted(
        passwordReset.userId,
        passwordReset.user.email,
        clientIP,
        userAgent
      );

      return c.json({ message: "Password has been reset successfully" });
    } catch (error) {
      logger.error({ error }, "Password reset error");
      return c.json({ error: "Failed to reset password" }, 500);
    }
  }
);

// Change password (authenticated)
passwordController.post(
  "/password-change",
  authenticate,
  strictRateLimiter,
  zValidator("json", PasswordChangeSchema),
  async (c) => {
    const { currentPassword, newPassword } = c.req.valid("json");
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
        },
      });

      if (!userWithPassword) {
        return c.json({ error: "User not found" }, 404);
      }

      // Verify current password
      const isPasswordValid = await comparePassword(
        currentPassword,
        userWithPassword.passwordHash
      );

      if (!isPasswordValid) {
        return c.json({ error: "Current password is incorrect" }, 400);
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      // Log password change for audit
      await auditService.logPasswordChange(
        user.id,
        userWithPassword.email,
        clientIP,
        userAgent
      );

      return c.json({ message: "Password updated successfully" });
    } catch (error) {
      logger.error({ error }, "Password change error");
      return c.json({ error: "Failed to change password" }, 500);
    }
  }
);

export default passwordController;
