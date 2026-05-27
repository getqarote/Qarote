import bcrypt from "bcryptjs";

import { SubscriptionStatus, UserPlan } from "@/generated/prisma/client";

// User interface without sensitive data
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  workspaceId: string | null;
  isActive: boolean;
  emailVerified?: boolean;
  pendingEmail?: string | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  locale?: string;
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
