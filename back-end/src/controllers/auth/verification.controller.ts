import { Hono } from "hono";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { authenticate, SafeUser } from "@/core/auth";
import { EmailVerificationService } from "@/services/email/email-verification.service";

const app = new Hono();

// Email verification endpoints
app.post("/verify-email", async (c) => {
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
app.post("/resend-verification", authenticate, async (c) => {
  const user = c.get("user") as SafeUser;

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
app.get("/verification-status", authenticate, async (c) => {
  const user = c.get("user") as SafeUser;

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

export default app;
