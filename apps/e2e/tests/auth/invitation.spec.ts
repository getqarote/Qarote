import { test, expect } from "../../fixtures/test-base.js";
import { uniqueEmail } from "../../helpers/factories/user.factory.js";

const apiUrl = process.env.API_URL || "http://localhost:3001";

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
    expect(admin, "Seeded admin user not found — did global-setup run?").toBeTruthy();

    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: admin!.id },
    });
    expect(workspace, "Seeded workspace not found — did global-setup run?").toBeTruthy();

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

  test("should return inviteUrl and emailSent in sendInvitation API response @selfhosted", async ({
    api,
    db,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Selfhosted mode only — tests invite URL when SMTP disabled"
    );

    // Login as admin to get auth cookie
    const { cookie } = await api.login(
      "admin@e2e-test.local",
      "TestPassword123!"
    );
    const authedApi = api.withAuth(cookie);

    const inviteEmail = uniqueEmail("invite-api");

    // Send invitation via API
    const result = await authedApi.mutation(
      "workspace.invitation.sendInvitation",
      { email: inviteEmail, role: "MEMBER" }
    );

    // Verify response includes inviteUrl and emailSent
    expect(result).toBeDefined();
    expect(result.inviteUrl).toBeDefined();
    expect(result.inviteUrl).toContain("/invite/");
    expect(typeof result.emailSent).toBe("boolean");

    // Assert based on E2E email config
    const emailEnabled = process.env.ENABLE_EMAIL === "true";
    expect(result.emailSent).toBe(emailEnabled);

    // Clean up
    if (result.invitation?.id) {
      db.track("Invitation", result.invitation.id);
    }
  });

  test("should show invitation details for self-hosted without subscription @selfhosted", async ({
    page,
    db,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Selfhosted mode only — tests getDetails without Stripe subscription"
    );

    const prisma = await db.getClient();
    const inviteEmail = uniqueEmail("invite-nosubscription");

    const admin = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });
    expect(admin, "Seeded admin user not found").toBeTruthy();

    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: admin!.id },
    });
    expect(workspace, "Seeded workspace not found").toBeTruthy();

    // Verify admin has no Subscription record (selfhosted scenario)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: admin!.id },
    });
    expect(subscription, "Expected no subscription for self-hosted scenario").toBeNull();

    const inviteToken = `e2e-nosub-${Date.now()}`;
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

    // The getDetails endpoint should NOT throw even if admin has no Subscription
    await page.goto(`/invite/${inviteToken}`);
    await page.waitForLoadState("domcontentloaded");

    // Should show invitation details (not an error page)
    await expect(
      page.getByText(/join qarote|invitation|accept/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Should NOT show "workspaceOwnerNoSubscription" error
    await expect(
      page.getByText(/subscription/i)
    ).not.toBeVisible({ timeout: 3_000 });
  });
});
