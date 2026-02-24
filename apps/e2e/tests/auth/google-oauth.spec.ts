import { expect, test } from "@playwright/test";

test.describe("Google OAuth Visibility @p1", () => {
  test("should show Google login button in cloud mode @cloud", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");
    // In cloud mode with ENABLE_OAUTH=true, the Google button should be visible
    await expect(
      page.getByText(/or continue with/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should not show Google login button in community mode @community", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");
    await page.waitForLoadState("networkidle");
    // In community mode, the "Or continue with" divider should not appear
    await expect(page.getByText(/or continue with/i)).not.toBeVisible();
  });

  test("should not show Google login on sign-up in community mode @community", async ({
    page,
  }) => {
    await page.goto("/auth/sign-up");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/or continue with/i)).not.toBeVisible();
  });
});
