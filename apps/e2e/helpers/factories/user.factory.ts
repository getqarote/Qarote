import { hashSync } from "bcryptjs";

let counter = 0;

export function uniqueEmail(prefix = "user"): string {
  counter++;
  return `${prefix}-${counter}-${Date.now()}@e2e-test.local`;
}

export async function createUser(
  prisma: any,
  overrides: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: "ADMIN" | "MEMBER" | "READONLY";
    emailVerified: boolean;
    workspaceId: string | null;
  }> = {}
) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || "TestPassword123!";

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashSync(password, 10),
      firstName: overrides.firstName || "Test",
      lastName: overrides.lastName || "User",
      role: overrides.role || "MEMBER",
      emailVerified: overrides.emailVerified ?? true,
      emailVerifiedAt:
        overrides.emailVerified !== false ? new Date() : undefined,
      workspaceId: overrides.workspaceId ?? null,
    },
  });

  return { user, password };
}
