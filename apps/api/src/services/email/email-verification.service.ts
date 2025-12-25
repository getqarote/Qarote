import type { User } from "@prisma/client";
import { addHours } from "date-fns";

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { EncryptionService } from "../encryption.service";
import { EmailService } from "./email.service";

export interface EmailVerificationOptions {
  userId: string;
  email: string;
  type: "SIGNUP" | "EMAIL_CHANGE";
}

export class EmailVerificationService {
  private static readonly TOKEN_EXPIRY_HOURS = 24;

  /**
   * Generate and store an email verification token
   */
  static async generateVerificationToken(
    options: EmailVerificationOptions
  ): Promise<string> {
    const { userId, email, type } = options;

    const token = EncryptionService.generateEncryptionKey();
    const expiresAt = addHours(new Date(), this.TOKEN_EXPIRY_HOURS);

    // Clean up any existing tokens for this user and type
    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId,
        type,
      },
    });

    // Create new verification token
    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId,
        email,
        type,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Send verification email using the email service
   */
  static async sendVerificationEmail(
    email: string,
    token: string,
    type: "SIGNUP" | "EMAIL_CHANGE",
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug(
        {
          email,
          type,
          userName,
          tokenLength: token.length,
        },
        "Sending verification email"
      );

      const result = await EmailService.sendVerificationEmail({
        to: email,
        userName,
        verificationToken: token,
        type,
      });

      if (!result.success) {
        logger.error(
          {
            email,
            type,
            error: result.error,
          },
          "Failed to send verification email"
        );
        return {
          success: false,
          error: result.error || "Failed to send verification email",
        };
      }

      logger.info(
        {
          email,
          type,
          messageId: result.messageId,
        },
        "Verification email sent successfully"
      );

      return { success: true };
    } catch (error) {
      logger.error(
        {
          email,
          type,
          error,
        },
        "Error in sendVerificationEmail"
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Verify an email verification token
   */
  static async verifyToken(token: string): Promise<{
    success: boolean;
    user?: User;
    email?: string;
    type?: string;
    error?: string;
  }> {
    try {
      logger.info(
        {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 8),
        },
        "Attempting to verify email token"
      );

      // Find the token
      const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!verificationToken) {
        logger.warn(
          {
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 8),
          },
          "Verification token not found"
        );
        return { success: false, error: "Invalid verification token" };
      }

      logger.info(
        {
          tokenId: verificationToken.id,
          userId: verificationToken.userId,
          type: verificationToken.type,
          expiresAt: verificationToken.expiresAt,
          currentTime: new Date(),
        },
        "Found verification token"
      );

      // Check if token has expired
      if (new Date() > verificationToken.expiresAt) {
        logger.warn(
          {
            tokenId: verificationToken.id,
            expiresAt: verificationToken.expiresAt,
            currentTime: new Date(),
          },
          "Verification token has expired"
        );
        // Clean up expired token
        await prisma.emailVerificationToken.delete({
          where: { id: verificationToken.id },
        });
        return { success: false, error: "Verification token has expired" };
      }

      const { user, email, type } = verificationToken;

      logger.info(
        {
          userId: user.id,
          email,
          type,
          currentEmailVerified: user.emailVerified,
        },
        "Processing email verification"
      );

      // Handle different verification types
      if (type === "SIGNUP") {
        // Update user's email verification status
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
          include: {
            subscription: {
              select: {
                plan: true,
              },
            },
          },
        });

        // Send welcome email after successful email verification
        try {
          await EmailService.sendWelcomeEmail({
            to: updatedUser.email,
            name: updatedUser.firstName || updatedUser.email,
            plan: updatedUser.subscription?.plan || "FREE",
          });

          logger.info(
            {
              userId: updatedUser.id,
              email: updatedUser.email,
            },
            "Welcome email sent after email verification"
          );
        } catch (emailError) {
          logger.error(
            { error: emailError, userId: updatedUser.id },
            "Failed to send welcome email after email verification"
          );
          // Don't fail the verification if welcome email fails
        }
      } else if (type === "EMAIL_CHANGE") {
        // Update user's email to the new verified email
        await prisma.user.update({
          where: { id: user.id },
          data: {
            email: email,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            pendingEmail: null,
          },
        });
      }

      // Clean up the used token
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id },
      });

      logger.info(
        {
          userId: user.id,
          email,
          type,
        },
        "Email verification completed successfully"
      );

      return {
        success: true,
        user,
        email,
        type,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 8),
        },
        "Error verifying email token:"
      );
      return { success: false, error: "Failed to verify email token" };
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(
    userId: string,
    type: "SIGNUP" | "EMAIL_CHANGE"
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Determine which email to verify
      const emailToVerify =
        type === "EMAIL_CHANGE" ? user.pendingEmail : user.email;

      if (!emailToVerify) {
        return { success: false, error: "No email to verify" };
      }

      // Generate new token
      const token = await this.generateVerificationToken({
        userId,
        email: emailToVerify,
        type,
      });

      // Send verification email
      const emailResult = await this.sendVerificationEmail(
        emailToVerify,
        token,
        type,
        user.firstName
      );

      if (!emailResult.success) {
        return {
          success: false,
          error: emailResult.error || "Failed to send verification email",
        };
      }

      return { success: true };
    } catch (error) {
      logger.error({ error }, "Error resending verification email");
      return { success: false, error: "Failed to resend verification email" };
    }
  }

  /**
   * Check if user has pending email verification
   */
  static async hasPendingVerification(
    userId: string,
    type?: "SIGNUP" | "EMAIL_CHANGE"
  ): Promise<boolean> {
    const whereClause: { userId: string; type?: "SIGNUP" | "EMAIL_CHANGE" } = {
      userId,
    };
    if (type) {
      whereClause.type = type;
    }

    const count = await prisma.emailVerificationToken.count({
      where: whereClause,
    });

    return count > 0;
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
