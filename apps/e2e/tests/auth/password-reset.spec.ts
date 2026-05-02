import { test, expect } from "../../fixtures/test-base.js";

test.describe("Password Reset Flow @p1", () => {
  test("should show forgot password form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /forgot password/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send reset link/i })
    ).toBeVisible();
  });

  test("should submit forgot password form for existing user", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByPlaceholder(/email/i).fill("admin@e2e-test.local");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Should show success heading
    await expect(
      page.getByRole("heading", { name: /check your email/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate back to sign-in from forgot password", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: /sign in/i }).click();
    await page.waitForURL("**/sign-in");
  });
});
