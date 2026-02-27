import { expect, test } from "../../fixtures/test-base.js";

test.describe("Google OAuth Visibility @p1", () => {
  test("should not show Google login button in selfhosted mode @selfhosted", async ({
    page,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Google OAuth is enabled in cloud mode"
    );

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");
    // In selfhosted mode with ENABLE_OAUTH=false, the Google button should not appear
    await expect(
      page.getByRole("button", { name: /google/i })
    ).not.toBeVisible();
  });

  test("should not show Google login on sign-up in selfhosted mode @selfhosted", async ({
    page,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Google OAuth is enabled in cloud mode"
    );

    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("button", { name: /google/i })
    ).not.toBeVisible();
  });

  test("should show Google login button in cloud mode @cloud", async ({
    page,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE !== "cloud",
      "Google OAuth only available in cloud mode"
    );

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");
    // In cloud mode with VITE_GOOGLE_CLIENT_ID set, the Google button should appear
    await expect(
      page.getByText(/or continue with/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show Google login on sign-up in cloud mode @cloud", async ({
    page,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE !== "cloud",
      "Google OAuth only available in cloud mode"
    );

    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByText(/or continue with/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should hide 'Or continue with' divider when no alt auth @selfhosted", async ({
    page,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "selfhosted mode — no Google OAuth, no SSO"
    );

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");
    // When neither Google OAuth nor SSO is available, the divider should be hidden
    await expect(
      page.getByText(/or continue with/i)
    ).not.toBeVisible();
  });

  test("should hide 'Or continue with' divider on sign-up when no alt auth @selfhosted", async ({
    page,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "selfhosted mode — no Google OAuth, no SSO"
    );

    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByText(/or continue with/i)
    ).not.toBeVisible();
  });
});
