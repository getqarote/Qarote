import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import {
  hashPassword,
  comparePassword,
  authenticate,
  SafeUser,
} from "@/core/auth";
import {
  PasswordResetRequestSchema,
  PasswordResetSchema,
  PasswordChangeSchema,
} from "@/schemas/auth";
import { EncryptionService } from "@/services/encryption.service";
import { isDevelopment } from "@/config";

const app = new Hono();

// Password reset request
app.post(
  "/password-reset/request",
  zValidator("json", PasswordResetRequestSchema),
  async (c) => {
    const { email } = c.req.valid("json");

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
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

      // Store the token in the database
      // In a real application, you would have a PasswordReset model
      // For simplicity, we're just returning the token here

      // Send email with reset link (not implemented in this example)
      // In a real application, you would send an email with the reset token

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

// Password reset
app.post(
  "/password-reset",
  zValidator("json", PasswordResetSchema),
  async (c) => {
    const { token, password } = c.req.valid("json");

    try {
      // In a real application, you would validate the token and find the user
      // For this example, we'll just return a success message
      return c.json({ message: "Password has been reset successfully" });
    } catch (error) {
      logger.error({ error }, "Password reset error");
      return c.json({ error: "Failed to reset password" }, 500);
    }
  }
);

// Change password (authenticated)
app.post(
  "/password-change",
  authenticate,
  zValidator("json", PasswordChangeSchema),
  async (c) => {
    const { currentPassword, newPassword } = c.req.valid("json");
    const user = c.get("user") as SafeUser;

    try {
      // Get user with password hash
      const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
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

      return c.json({ message: "Password updated successfully" });
    } catch (error) {
      logger.error({ error }, "Password change error");
      return c.json({ error: "Failed to change password" }, 500);
    }
  }
);

export default app;
