import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";

import { authConfig } from "@/config";

import { prisma } from "./prisma";

import {
  SubscriptionStatus,
  UserPlan,
  UserRole,
} from "@/generated/prisma/client";

// JWT Token interfaces
interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  workspaceId: string | null;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

// User interface without sensitive data
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified?: boolean;
  pendingEmail?: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscription?: {
    plan: UserPlan;
    status: SubscriptionStatus;
  } | null;
}

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Token generation
export const generateToken = async (user: {
  id: string;
  email: string;
  role: UserRole;
  workspaceId: string | null;
}): Promise<string> => {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    workspaceId: user.workspaceId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // Default 7 days expiry
  };

  return sign(payload, authConfig.jwtSecret);
};

// Token verification
const verifyToken = async (token: string): Promise<JWTPayload> => {
  try {
    return (await verify(token, authConfig.jwtSecret, "HS256")) as JWTPayload;
  } catch (error) {
    throw new Error(
      `Invalid token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Extract user from token
export const extractUserFromToken = async (
  token: string
): Promise<SafeUser | null> => {
  try {
    const payload = await verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        workspaceId: true,
        isActive: true,
        emailVerified: true,
        pendingEmail: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    return user;
  } catch {
    return null;
  }
};
