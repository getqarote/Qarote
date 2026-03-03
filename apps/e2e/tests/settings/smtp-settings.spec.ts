import { expect, test } from "../../fixtures/test-base.js";

test.describe("SMTP Settings Page @p1 @selfhosted", () => {
  test.describe("Access Control", () => {
    test("admin can access SMTP settings page", async ({ adminPage }) => {
      await adminPage.goto("/settings/smtp");

      // Should see the SMTP settings page with the enable/disable toggle
      await expect(adminPage.locator("#smtp-enabled")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("non-admin user is redirected away from SMTP settings", async ({
      readonlyPage,
    }) => {
      await readonlyPage.goto("/settings/smtp");

      // Should be redirected to home page (the SMTP page does Navigate to="/")
      await expect(readonlyPage).toHaveURL("/", { timeout: 10_000 });
    });
  });

  test.describe("Form Interactions", () => {
    test("toggling email enabled reveals configuration sections", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/smtp");

      // Wait for the toggle to appear
      const toggle = adminPage.locator("#smtp-enabled");
      await expect(toggle).toBeVisible({ timeout: 15_000 });

      // Initially disabled — SMTP fields should not be visible
      await expect(adminPage.locator("#smtp-host")).not.toBeVisible();

      // Toggle email enabled
      await toggle.click();

      // Now SMTP fields should be visible
      await expect(adminPage.locator("#smtp-host")).toBeVisible();
      await expect(adminPage.locator("#smtp-port")).toBeVisible();
      await expect(adminPage.locator("#from-email")).toBeVisible();
      await expect(adminPage.locator("#smtp-user")).toBeVisible();
      await expect(adminPage.locator("#smtp-pass")).toBeVisible();
    });

    test("OAuth2 fields are visible when email is enabled", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/smtp");

      // Wait for the toggle and enable email
      const toggle = adminPage.locator("#smtp-enabled");
      await expect(toggle).toBeVisible({ timeout: 15_000 });
      await toggle.click();

      // OAuth2 fields should be visible
      await expect(adminPage.locator("#smtp-service")).toBeVisible();
      await expect(adminPage.locator("#oauth-client-id")).toBeVisible();
      await expect(adminPage.locator("#oauth-client-secret")).toBeVisible();
      await expect(adminPage.locator("#oauth-refresh-token")).toBeVisible();
    });

    test("save button is always visible", async ({ adminPage }) => {
      await adminPage.goto("/settings/smtp");

      // Wait for page to load
      await expect(adminPage.locator("#smtp-enabled")).toBeVisible({
        timeout: 15_000,
      });

      // Save button should be visible regardless of enabled state
      await expect(
        adminPage.getByRole("button", { name: /save/i })
      ).toBeVisible();
    });
  });
});
