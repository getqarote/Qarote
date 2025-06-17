import { randomBytes } from "node:crypto";
import { Context } from "hono";
import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import prisma from "./prisma";

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "secret-key-change-in-production";

// JWT Token interfaces
interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  workspaceId?: string | null;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

// User interface without sensitive data
export interface SafeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  workspaceId: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

  return sign(payload, JWT_SECRET);
};

// Token verification
export const verifyToken = async (token: string): Promise<JWTPayload> => {
  try {
    return (await verify(token, JWT_SECRET)) as JWTPayload;
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
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticate = async (c: Context, next: () => Promise<void>) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401
    );
  }

  const token = authHeader.split(" ")[1];
  const user = await extractUserFromToken(token);

  if (!user) {
    return c.json(
      { error: "Unauthorized", message: "Invalid or expired token" },
      401
    );
  }

  if (!user.isActive) {
    return c.json({ error: "Forbidden", message: "Account is inactive" }, 403);
  }

  // Set user in the context variables for use in route handlers
  c.set("user", user);
  await next();
};

// Role-based authorization middleware
export const authorize = (allowedRoles: UserRole[]) => {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        403
      );
    }

    await next();
  };
};

// Workspace access check middleware
export const checkWorkspaceAccess = async (
  c: Context,
  next: () => Promise<void>
) => {
  const user = c.get("user");
  const workspaceId = c.req.param("id");

  if (!user) {
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401
    );
  }

  // Allow ADMIN users to access any workspace
  if (user.role === UserRole.ADMIN) {
    await next();
    return;
  }

  // Check if user belongs to the requested workspace
  if (!user.workspaceId || user.workspaceId !== workspaceId) {
    return c.json(
      {
        error: "Forbidden",
        message: "Cannot access resources for this workspace",
      },
      403
    );
  }

  await next();
};

// Company access check middleware (deprecated - use checkWorkspaceAccess)
export const checkCompanyAccess = async (
  c: Context,
  next: () => Promise<void>
) => {
  const user = c.get("user");
  const workspaceId = c.req.param("companyId"); // Legacy parameter name for backward compatibility

  if (!user) {
    return c.json(
      { error: "Unauthorized", message: "Authentication required" },
      401
    );
  }

  // Allow ADMIN users to access any workspace
  if (user.role === UserRole.ADMIN) {
    await next();
    return;
  }

  // Check if user belongs to the requested workspace
  if (!user.workspaceId || user.workspaceId !== workspaceId) {
    return c.json(
      {
        error: "Forbidden",
        message: "Cannot access resources for this workspace",
      },
      403
    );
  }

  await next();
};

// Generate a random token
export const generateRandomToken = (length = 32): string => {
  return randomBytes(length).toString("hex");
};
