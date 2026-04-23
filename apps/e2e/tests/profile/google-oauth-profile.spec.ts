import { expect, test } from "../../fixtures/test-base.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

/**
 * Regression test: Google OAuth users must NOT see the password / email
 * change forms on the profile page.  They should instead see the
 * "Your account is managed by Google" card.
 *
 * We simulate a Google-authenticated session by mocking the getSession
 * tRPC response to include a non-null `googleId`.
 */
test.describe("Google OAuth Profile Security @p1", () => {
  test("should hide password and email change forms for Google OAuth users", async ({
    adminPage,
  }) => {
    // Mock getSession to return a user with googleId set (simulates Google OAuth login)
    await mockTrpcQuery(adminPage, "auth.session.getSession", {
      user: {
        id: "mock-google-user-id",
        email: "admin@e2e-test.local",
        firstName: "E2E",
        lastName: "Admin",
        role: "ADMIN",
        workspaceId: "mock-workspace-id",
        isActive: true,
        emailVerified: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authProvider: "google",
        subscription: null,
        workspace: { id: "mock-workspace-id" },
      },
    });

    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should see the "managed by Google" card
    await expect(
      adminPage.getByText(/account is managed by google/i)
    ).toBeVisible({ timeout: 15_000 });

    // Should NOT see password change form
    await expect(
      adminPage.getByText(/change password/i)
    ).not.toBeVisible();

    // Should NOT see email change form
    await expect(
      adminPage.getByRole("heading", { name: /email address/i })
    ).not.toBeVisible();
  });

  test("should show password and email change forms for non-Google users", async ({
    adminPage,
  }) => {
    // No mock — uses the real seeded admin user (no googleId)
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should see the Security Settings section with password change
    await expect(
      adminPage.getByText(/security settings/i)
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      adminPage.getByText(/change password/i)
    ).toBeVisible();

    // Should NOT see "managed by Google" card
    await expect(
      adminPage.getByText(/account is managed by google/i)
    ).not.toBeVisible();
  });
});
