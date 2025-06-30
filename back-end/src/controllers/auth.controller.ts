import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { InvitationStatus, UserRole } from "@prisma/client";
import { prisma } from "@/core/prisma";
import { logger } from "@/core/logger";
import { setSentryUser } from "@/core/sentry";
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticate,
  SafeUser,
} from "@/core/auth";
import {
  RegisterUserSchema,
  LoginSchema,
  PasswordResetRequestSchema,
  PasswordResetSchema,
  PasswordChangeSchema,
  AcceptInvitationSchema,
} from "@/schemas/auth";
import { sendWelcomeEmail } from "@/services/email/email.service";
import { EncryptionService } from "@/services/encryption.service";
import { EmailVerificationService } from "@/services/email/email-verification.service";
import { isDevelopment } from "@/config";

const authController = new Hono();

// User registration
authController.post(
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
        let workspaceId: string;

        // Create workspace if workspaceName is provided
        // TODO: workspaceName should be required
        if (workspaceName) {
          const workspace = await tx.workspace.create({
            data: {
              name: workspaceName,
              contactEmail: email,
              consentGiven: acceptTerms || false,
              consentDate: acceptTerms ? new Date() : null,
            },
          });
          workspaceId = workspace.id;
        } else {
          // For now, throw an error if no workspace name is provided
          // In the future, we might want to handle this differently
          throw new Error("Workspace name is required for registration");
        }

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
            result.user.firstName || "User"
          );

        if (!emailResult.success) {
          logger.error(
            "Failed to send verification email during registration:",
            emailResult.error
          );
        }
      } catch (emailError) {
        logger.error(
          "Failed to send verification email during registration:",
          emailError
        );
        // Don't fail the registration if email verification fails
      }

      // Send welcome email for new workspace owners (optional, after verification)
      if (result.workspaceId && workspaceName) {
        try {
          const workspace = await prisma.workspace.findUnique({
            where: { id: result.workspaceId },
            select: { name: true, plan: true },
          });

          if (workspace) {
            await sendWelcomeEmail({
              to: result.user.email,
              name: result.user.firstName || result.user.email,
              workspaceName: workspace.name,
              plan: workspace.plan,
            });
          }
        } catch (emailError) {
          logger.error(
            "Failed to send welcome email during registration:",
            emailError
          );
          // Don't fail the registration if email fails
        }
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
      logger.error("Registration error:", error);
      return c.json({ error: "Failed to register user" }, 500);
    }
  }
);

// User login
authController.post("/login", zValidator("json", LoginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    if (!user.isActive) {
      return c.json({ error: "Account is inactive" }, 403);
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return c.json(
        {
          error: "Email not verified",
          message:
            "Please verify your email address before logging in. Check your inbox for a verification email.",
        },
        403
      );
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    });

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      workspaceId: user.workspaceId,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Set Sentry user context
    setSentryUser({
      id: user.id,
      workspaceId: user.workspaceId,
      email: user.email,
    });

    return c.json({ user: safeUser, token });
  } catch (error) {
    logger.error("Login error:", error);
    return c.json({ error: "Failed to log in" }, 500);
  }
});

// Get current user profile
authController.get("/me", authenticate, async (c) => {
  const user = c.get("user") as SafeUser;

  try {
    // Get user with workspace information
    const userWithWorkspace = await prisma.user.findUnique({
      where: { id: user.id },
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
        pendingEmail: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
            plan: true,
          },
        },
      },
    });

    if (!userWithWorkspace) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ user: userWithWorkspace });
  } catch (error) {
    logger.error("Get profile error:", error);
    return c.json({ error: "Failed to retrieve user profile" }, 500);
  }
});

// Email verification endpoints
authController.post("/verify-email", async (c) => {
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
    logger.error("Email verification error:", error);
    return c.json({ error: "Failed to verify email" }, 500);
  }
});

// Resend verification email
authController.post("/resend-verification", authenticate, async (c) => {
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
    logger.error("Resend verification error:", error);
    return c.json({ error: "Failed to resend verification email" }, 500);
  }
});

// Check verification status
authController.get("/verification-status", authenticate, async (c) => {
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
    logger.error("Verification status error:", error);
    return c.json({ error: "Failed to get verification status" }, 500);
  }
});

// Password reset request
authController.post(
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
      logger.error("Password reset request error:", error);
      return c.json({ error: "Failed to process password reset request" }, 500);
    }
  }
);

// Password reset
authController.post(
  "/password-reset",
  zValidator("json", PasswordResetSchema),
  async (c) => {
    const { token, password } = c.req.valid("json");

    try {
      // In a real application, you would validate the token and find the user
      // For this example, we'll just return a success message
      return c.json({ message: "Password has been reset successfully" });
    } catch (error) {
      logger.error("Password reset error:", error);
      return c.json({ error: "Failed to reset password" }, 500);
    }
  }
);

// Change password (authenticated)
authController.post(
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
      logger.error("Password change error:", error);
      return c.json({ error: "Failed to change password" }, 500);
    }
  }
);

// Accept invitation
authController.post(
  "/invitation/accept",
  zValidator("json", AcceptInvitationSchema),
  async (c) => {
    const { token, password, firstName, lastName } = c.req.valid("json");

    try {
      // Find invitation by token
      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { workspace: true },
      });

      if (!invitation) {
        return c.json({ error: "Invalid invitation token" }, 400);
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return c.json(
          { error: "Invitation has already been used or expired" },
          400
        );
      }

      const now = new Date();
      if (invitation.expiresAt < now) {
        // Update invitation status to expired
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        return c.json({ error: "Invitation has expired" }, 400);
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: invitation.email },
      });

      const isNewUser = !user; // Track if this is a new user

      // Transaction to handle user creation/update and invitation acceptance
      const result = await prisma.$transaction(async (tx) => {
        if (user) {
          // Update existing user's workspace
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              workspaceId: invitation.workspaceId,
              role: invitation.role,
            },
          });
        } else {
          // Create new user
          if (!password || !firstName || !lastName) {
            throw new Error(
              "Password, first name, and last name are required for new users"
            );
          }

          const hashedPassword = await hashPassword(password);
          user = await tx.user.create({
            data: {
              email: invitation.email,
              passwordHash: hashedPassword,
              firstName,
              lastName,
              workspaceId: invitation.workspaceId,
              role: invitation.role,
              lastLogin: new Date(),
            },
          });
        }

        // Update invitation status
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.ACCEPTED,
            invitedUserId: user.id,
          },
        });

        return user;
      });

      // Generate JWT token
      const authToken = await generateToken({
        id: result.id,
        email: result.email,
        role: result.role,
        workspaceId: result.workspaceId,
      });

      // Send welcome email for newly created users
      if (isNewUser) {
        try {
          await sendWelcomeEmail({
            to: result.email,
            name: result.firstName || result.email,
            workspaceName: invitation.workspace.name,
            plan: invitation.workspace.plan,
          });
        } catch (emailError) {
          logger.error(
            "Failed to send welcome email during invitation acceptance:",
            emailError
          );
          // Don't fail the invitation acceptance if email fails
        }
      }

      const safeUser: SafeUser = {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
        workspaceId: result.workspaceId,
        isActive: result.isActive,
        lastLogin: result.lastLogin,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return c.json({
        user: safeUser,
        token: authToken,
        workspace: invitation.workspace,
      });
    } catch (error) {
      logger.error("Accept invitation error:", error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to accept invitation" }, 500);
    }
  }
);

export default authController;
