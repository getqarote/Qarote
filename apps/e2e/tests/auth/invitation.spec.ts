import { test, expect } from "../../fixtures/test-base.js";
import { uniqueEmail } from "../../helpers/factories/user.factory.js";

test.describe("Invitation Flow @p1", () => {
  test("should show invitation acceptance page with valid token", async ({
    page,
    db,
  }) => {
    const prisma = await db.getClient();
    const inviteEmail = uniqueEmail("invite");

    const admin = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: admin!.id },
    });

    const inviteToken = `e2e-invite-${Date.now()}`;
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

    await page.goto(`/invite/${inviteToken}`);
    await page.waitForLoadState("domcontentloaded");

    // Should show "Join Qarote" heading or workspace/invitation details
    await expect(
      page.getByText(/join qarote|invitation|accept/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show error for invalid invitation token", async ({ page }) => {
    await page.goto("/invite/invalid-token-12345");
    await page.waitForLoadState("domcontentloaded");

    // Should show an error about invalid/expired invitation
    await expect(
      page.getByText(/invalid|expired|not found|error/i).first().or(
        page.getByRole("heading", { name: /sign in/i })
      )
    ).toBeVisible({ timeout: 10_000 });
  });
});
