import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authenticate } from "@/core/auth";
import { EmailVerificationService } from "@/services/email/email-verification.service";
import { notionService } from "@/services/integrations/notion.service";

const verificationController = new Hono();

// Email verification endpoints
verificationController.post("/verify-email", async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return c.json({ error: "Verification token is required" }, 400);
    }

    const result = await EmailVerificationService.verifyToken(token);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    // Include updated user info in response
    const updatedUser = await prisma.user.findUnique({
      where: { id: result.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        workspaceId: true,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Update user in Notion when email is verified (non-blocking)
    if (updatedUser && updatedUser.emailVerified) {
      try {
        const notionResult = await notionService.findUserByUserId(
          updatedUser.id
        );

        if (notionResult.success && notionResult.notionPageId) {
          // Update existing Notion page
          await notionService.updateUser(notionResult.notionPageId, {
            emailVerified: true,
          });
          logger.info(
            { userId: updatedUser.id, notionPageId: notionResult.notionPageId },
            "User email verification status updated in Notion"
          );
        } else {
          // User doesn't exist in Notion yet, create them
          const createResult = await notionService.createUser({
            userId: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            emailVerified: updatedUser.emailVerified,
            createdAt: updatedUser.createdAt,
            role: updatedUser.role,
            workspaceId: updatedUser.workspaceId,
          });

          if (createResult.success) {
            logger.info(
              {
                userId: updatedUser.id,
                notionPageId: createResult.notionPageId,
              },
              "User created in Notion during email verification"
            );
          } else {
            logger.warn(
              { error: createResult.error, userId: updatedUser.id },
              "Failed to create user in Notion during email verification"
            );
          }
        }
      } catch (notionError) {
        logger.error(
          { error: notionError, userId: updatedUser.id },
          "Failed to sync user to Notion during email verification"
        );
        // Don't fail the verification if Notion sync fails
      }
    }

    return c.json({
      message: "Email verified successfully",
      user: updatedUser,
      type: result.type,
    });
  } catch (error) {
    logger.error({ error }, "Email verification error");
    return c.json({ error: "Failed to verify email" }, 500);
  }
});

// Resend verification email
verificationController.post("/resend-verification", authenticate, async (c) => {
  const user = c.get("user");

  try {
    const body = await c.req.json();
    const { type = "SIGNUP" } = body;

    if (type !== "SIGNUP" && type !== "EMAIL_CHANGE") {
      return c.json({ error: "Invalid verification type" }, 400);
    }

    const result = await EmailVerificationService.resendVerificationEmail(
      user.id,
      type
    );

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      message: "Verification email sent successfully",
    });
  } catch (error) {
    logger.error({ error }, "Resend verification error");
    return c.json({ error: "Failed to resend verification email" }, 500);
  }
});

// Check verification status
verificationController.get("/verification-status", authenticate, async (c) => {
  const user = c.get("user");

  try {
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        emailVerified: true,
        emailVerifiedAt: true,
        pendingEmail: true,
      },
    });

    if (!userInfo) {
      return c.json({ error: "User not found" }, 404);
    }

    const hasPendingSignupVerification =
      await EmailVerificationService.hasPendingVerification(user.id, "SIGNUP");
    const hasPendingEmailChange =
      await EmailVerificationService.hasPendingVerification(
        user.id,
        "EMAIL_CHANGE"
      );

    return c.json({
      emailVerified: userInfo.emailVerified,
      emailVerifiedAt: userInfo.emailVerifiedAt,
      pendingEmail: userInfo.pendingEmail,
      hasPendingSignupVerification,
      hasPendingEmailChange,
    });
  } catch (error) {
    logger.error({ error }, "Verification status error");
    return c.json({ error: "Failed to get verification status" }, 500);
  }
});

export default verificationController;
