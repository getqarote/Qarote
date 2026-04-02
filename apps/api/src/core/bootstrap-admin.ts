import fs from "node:fs";
import path from "node:path";

import { hashPassword } from "@/core/auth";
import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";
import { ensureWorkspaceMember } from "@/core/workspace-access";

import { adminBootstrapConfig } from "@/config";

import { OrgRole, UserRole } from "@/generated/prisma/client";

/**
 * Bootstrap the first admin user on first boot.
 *
 * Conditions:
 * 1. ADMIN_EMAIL and ADMIN_PASSWORD env vars are set
 * 2. No users exist in the database (first boot)
 *
 * After creation, removes ADMIN_EMAIL and ADMIN_PASSWORD from .env for security.
 */
export async function bootstrapAdmin(): Promise<void> {
  const { email, password } = adminBootstrapConfig;

  if (!email && !password) {
    return;
  }

  // Clean up partial credentials (e.g. only email or only password set)
  if (!email || !password) {
    logger.warn("Incomplete admin bootstrap credentials — removing from .env");
    removeAdminEnvVars();
    return;
  }

  logger.info({ email }, "Bootstrapping admin account");

  const hashedPassword = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    // Idempotency guard inside transaction to prevent races
    const existingUser = await tx.user.findFirst({ select: { id: true } });
    if (existingUser) {
      logger.debug("Users already exist — skipping admin bootstrap");
      return;
    }

    // Create a default organization for the admin user
    const org = await tx.organization.create({
      data: {
        name: "Default Organization",
        slug: `default-${Date.now()}`,
        contactEmail: email,
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        name: "Default Workspace",
        contactEmail: email,
        organizationId: org.id,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName: "Admin",
        lastName: "",
        name: "Admin",
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        workspaceId: workspace.id,
      },
    });

    // Create the better-auth credential account so sign-in works
    await tx.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPassword,
      },
    });

    await tx.workspace.update({
      where: { id: workspace.id },
      data: { ownerId: user.id },
    });

    // Make the admin user the organization owner
    await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: OrgRole.OWNER,
      },
    });

    await ensureWorkspaceMember(user.id, workspace.id, UserRole.ADMIN, tx);

    logger.info(
      { userId: user.id, workspaceId: workspace.id, email },
      "Admin account bootstrapped successfully"
    );
  });

  removeAdminEnvVars();
}

/**
 * Remove ADMIN_EMAIL and ADMIN_PASSWORD lines from .env file.
 */
function removeAdminEnvVars(): void {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    const filtered = content
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return (
          !trimmed.startsWith("ADMIN_EMAIL=") &&
          !trimmed.startsWith("ADMIN_PASSWORD=") &&
          trimmed !== "# Admin (auto-removed after first boot)"
        );
      })
      .join("\n");

    const cleaned = filtered.replace(/\n{3,}/g, "\n\n");
    fs.writeFileSync(envPath, cleaned, { mode: 0o600 });
    logger.info("Removed admin credentials from .env");
  } catch (err) {
    logger.warn(
      { err },
      "Failed to clean admin credentials from .env — please remove manually"
    );
  }
}
