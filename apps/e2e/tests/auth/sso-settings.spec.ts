import { expect, test } from "../../fixtures/test-base.js";

test.describe("SSO Settings Page @p1 @adminonly", () => {
  test.describe("Access Control", () => {
    test("admin can access SSO settings page", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");

      // Should see the SSO settings heading (Shield icon area)
      await expect(
        adminPage.getByRole("heading").filter({ hasText: /sso|single sign/i }).first()
      ).toBeVisible({ timeout: 15_000 });
    });

    test("non-admin user sees empty page for SSO settings", async ({
      readonlyPage,
    }) => {
      await readonlyPage.goto("/settings/sso");

      // Non-admins get null returned — SSO content should not be visible
      await expect(
        readonlyPage.locator("#sso-enabled")
      ).not.toBeVisible({ timeout: 5_000 });
    });
  });

  test.describe("Setup Form (no existing provider)", () => {
    test("shows OIDC fields by default", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      // In setup mode, OIDC discovery URL field should be visible
      await expect(
        adminPage.locator("#setup-discovery-url")
      ).toBeVisible({ timeout: 15_000 });

      await expect(adminPage.locator("#setup-client-id")).toBeVisible();
      await expect(adminPage.locator("#setup-client-secret")).toBeVisible();
      await expect(adminPage.locator("#setup-saml-metadata")).not.toBeVisible();
    });

    test("switching to SAML shows metadata URL field", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      // Wait for setup form
      await expect(
        adminPage.locator("#setup-discovery-url")
      ).toBeVisible({ timeout: 15_000 });

      // Switch to SAML
      await adminPage
        .getByRole("combobox")
        .filter({ hasText: /oidc/i })
        .click();
      await adminPage.getByRole("option", { name: /saml/i }).click();

      // SAML field visible, OIDC fields hidden
      await expect(adminPage.locator("#setup-saml-metadata")).toBeVisible();
      await expect(adminPage.locator("#setup-discovery-url")).not.toBeVisible();
      await expect(adminPage.locator("#setup-client-id")).not.toBeVisible();
    });

    test("displays better-auth callback URL pattern in IdP registration hint", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      // The URL hint section should show /api/auth/sso/callback pattern
      await expect(
        adminPage.getByText(/\/api\/auth\/sso\/(callback|saml2)/)
      ).toBeVisible({ timeout: 15_000 });
    });
  });
});
