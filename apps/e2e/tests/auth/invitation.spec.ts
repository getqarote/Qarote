import { test, expect } from "../../fixtures/test-base.js";
import { uniqueEmail } from "../../helpers/factories/user.factory.js";

test.describe("Invitation Flow @p1", () => {
  test("should show invitation acceptance page with valid token", async ({
    page,
    db,
  }) => {
    const prisma = await db.getClient();
    const inviteEmail = uniqueEmail("invite");

    // Get admin user and workspace
    const admin = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: admin!.id },
    });

    // Create invitation directly in DB
    const inviteToken = `e2e-invite-${Date.now()}`;
    const invitation = await prisma.invitation.create({
      data: {
        email: inviteEmail,
        token: inviteToken,
        invitedById: admin!.id,
        workspaceId: workspace!.id,
        role: "MEMBER",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    db.track("Invitation", invitation.id);

    await page.goto(`/accept-invitation?token=${inviteToken}`);

    // Should show the invitation form
    await expect(
      page.getByText(new RegExp(workspace!.name, "i"))
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder("John")).toBeVisible();
    await expect(page.getByPlaceholder("Doe")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your password")).toBeVisible();
    await expect(
      page.getByPlaceholder("Confirm your password")
    ).toBeVisible();
  });

  test("should show email as read-only on invitation page", async ({
    page,
    db,
  }) => {
    const prisma = await db.getClient();
    const inviteEmail = uniqueEmail("invite-ro");

    const admin = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: admin!.id },
    });

    const inviteToken = `e2e-invite-ro-${Date.now()}`;
    const invitation = await prisma.invitation.create({
      data: {
        email: inviteEmail,
        token: inviteToken,
        invitedById: admin!.id,
        workspaceId: workspace!.id,
        role: "MEMBER",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    db.track("Invitation", invitation.id);

    await page.goto(`/accept-invitation?token=${inviteToken}`);

    // Email field should be visible and disabled
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(emailInput).toBeDisabled();
  });

  test("should show error for invalid invitation token", async ({ page }) => {
    await page.goto("/accept-invitation?token=invalid-token-12345");

    // Should show an error state
    await expect(
      page.getByText(/invalid|expired|not found/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should have sign-in link on invitation page", async ({ page, db }) => {
    const prisma = await db.getClient();
    const inviteEmail = uniqueEmail("invite-link");

    const admin = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: admin!.id },
    });

    const inviteToken = `e2e-invite-link-${Date.now()}`;
    const invitation = await prisma.invitation.create({
      data: {
        email: inviteEmail,
        token: inviteToken,
        invitedById: admin!.id,
        workspaceId: workspace!.id,
        role: "MEMBER",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    db.track("Invitation", invitation.id);

    await page.goto(`/accept-invitation?token=${inviteToken}`);

    await expect(
      page.getByRole("link", { name: /sign in/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
