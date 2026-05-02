import { expect, test } from "../../fixtures/test-base.js";

test.describe("Digest Settings Page @p1", () => {
  test.describe("Access Control", () => {
    test("admin can access the digest settings page", async ({ adminPage }) => {
      await adminPage.goto("/settings/digest");

      await expect(adminPage.locator("h2").first()).toBeVisible({
        timeout: 15_000,
      });
    });

    test("non-admin member is redirected away from digest settings", async ({
      memberPage,
    }) => {
      await memberPage.goto("/settings/digest");

      await expect(memberPage).not.toHaveURL("/settings/digest", {
        timeout: 10_000,
      });
    });
  });

  test.describe("Enable Toggle", () => {
    test("schedule section is hidden when digest is disabled", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/digest");

      // Wait for the page to load
      const toggle = adminPage.getByRole("switch").first();
      await expect(toggle).toBeVisible({ timeout: 15_000 });

      // Make sure digest is off
      const isChecked = await toggle.isChecked();
      if (isChecked) await toggle.click();

      // Schedule section should not be visible
      await expect(adminPage.getByText("When to send")).not.toBeVisible();
    });

    test("schedule section appears after enabling digest", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/digest");

      const toggle = adminPage.getByRole("switch").first();
      await expect(toggle).toBeVisible({ timeout: 15_000 });

      // Ensure toggle is off, then enable
      if (await toggle.isChecked()) await toggle.click();
      await toggle.click();

      // Schedule section should now be visible
      await expect(adminPage.getByText("When to send")).toBeVisible({
        timeout: 5_000,
      });
    });
  });

  test.describe("Send Test Digest", () => {
    test("Send test digest button is visible when digest is enabled", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/digest");

      const toggle = adminPage.getByRole("switch").first();
      await expect(toggle).toBeVisible({ timeout: 15_000 });

      // Enable if needed
      const isChecked = await toggle.isChecked();
      if (!isChecked) await toggle.click();

      await expect(
        adminPage.getByRole("button", { name: /send test digest/i })
      ).toBeVisible({ timeout: 5_000 });
    });
  });
});
