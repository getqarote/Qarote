import { expect, test } from "../../fixtures/test-base.js";

test.describe("SSO Settings Page @p1 @selfhosted", () => {
  test.describe("Access Control", () => {
    test("admin can access SSO settings page", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");

      // Should see the SSO settings page with the enable/disable toggle
      await expect(adminPage.locator("#sso-enabled")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("non-admin user is redirected away from SSO settings", async ({
      readonlyPage,
    }) => {
      await readonlyPage.goto("/settings/sso");

      // Should be redirected to home page (the SSO page does Navigate to="/")
      await expect(readonlyPage).toHaveURL("/", { timeout: 10_000 });
    });
  });

  test.describe("Form Interactions", () => {
    test("toggling SSO enabled reveals configuration sections", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");

      // Wait for the toggle to appear
      const toggle = adminPage.locator("#sso-enabled");
      await expect(toggle).toBeVisible({ timeout: 15_000 });

      // Initially disabled — OIDC fields should not be visible
      await expect(adminPage.locator("#discovery-url")).not.toBeVisible();

      // Toggle SSO enabled
      await toggle.click();

      // Now OIDC fields should be visible (OIDC is the default protocol)
      await expect(adminPage.locator("#discovery-url")).toBeVisible();
      await expect(adminPage.locator("#client-id")).toBeVisible();
      await expect(adminPage.locator("#client-secret")).toBeVisible();
    });

    test("switching protocol between OIDC and SAML shows correct fields", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");

      // Wait for the toggle and enable SSO
      const toggle = adminPage.locator("#sso-enabled");
      await expect(toggle).toBeVisible({ timeout: 15_000 });
      await toggle.click();

      // OIDC fields should be visible by default
      await expect(adminPage.locator("#discovery-url")).toBeVisible();
      await expect(adminPage.locator("#client-id")).toBeVisible();
      await expect(adminPage.locator("#client-secret")).toBeVisible();
      await expect(adminPage.locator("#saml-metadata")).not.toBeVisible();

      // Switch to SAML via the protocol select dropdown (filter by current OIDC text)
      await adminPage
        .getByRole("combobox")
        .filter({ hasText: /oidc/i })
        .click();
      await adminPage.getByRole("option", { name: /saml/i }).click();

      // SAML field should be visible, OIDC fields should be hidden
      await expect(adminPage.locator("#saml-metadata")).toBeVisible();
      await expect(adminPage.locator("#discovery-url")).not.toBeVisible();
      await expect(adminPage.locator("#client-id")).not.toBeVisible();
      await expect(adminPage.locator("#client-secret")).not.toBeVisible();
    });

    test("callback URL is displayed when API URL is present", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");

      // Wait for the toggle and enable SSO
      const toggle = adminPage.locator("#sso-enabled");
      await expect(toggle).toBeVisible({ timeout: 15_000 });
      await toggle.click();

      // The API URL field should be populated (from env config)
      const apiUrlInput = adminPage.locator("#api-url");
      await expect(apiUrlInput).toBeVisible();
      const apiUrlValue = await apiUrlInput.inputValue();

      if (apiUrlValue) {
        // Callback URL should be displayed
        await expect(
          adminPage.getByText(`${apiUrlValue}/sso/callback`)
        ).toBeVisible();
      }
    });
  });
});
