import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  authenticate,
  comparePassword,
  generateToken,
  SafeUser,
} from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { setSentryUser } from "@/services/sentry";

import { LoginSchema } from "@/schemas/auth";

const sessionController = new Hono();

// User login
sessionController.post("/login", zValidator("json", LoginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
        emailVerified: true,
        passwordHash: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
        workspaceId: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        workspace: {
          select: {
            id: true,
          },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
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

    // Check if user has a password (not OAuth-only user)
    if (!user.passwordHash) {
      return c.json(
        {
          error:
            "This account uses Google sign-in. Please use the 'Sign in with Google' button.",
        },
        400
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
      workspaceId: user.workspace?.id || null,
    });

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      workspaceId: user.workspace?.id || null,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
          }
        : null,
    };

    // Set Sentry user context
    setSentryUser({
      id: user.id,
      workspaceId: user.workspace?.id || null,
      email: user.email,
    });

    return c.json({ user: safeUser, token });
  } catch (error) {
    logger.error({ error }, "Login error");
    return c.json({ error: "Failed to log in" }, 500);
  }
});

// Get current user profile
sessionController.get("/me", authenticate, async (c) => {
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
        googleId: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        workspace: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            logoUrl: true,
          },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!userWithWorkspace) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ user: userWithWorkspace });
  } catch (error) {
    logger.error({ error }, "Get profile error");
    return c.json({ error: "Failed to retrieve user profile" }, 500);
  }
});

export default sessionController;
