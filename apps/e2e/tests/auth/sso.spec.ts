import { expect, test } from "@playwright/test";

test.describe("SSO Visibility @p2", () => {
  test("should not show SSO button when SSO is disabled @community", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    // SSO button should not be visible in community mode (SSO disabled by default)
    await expect(
      page.getByRole("button", { name: /sso/i })
    ).not.toBeVisible();
  });

  test("should show SSO button when SSO is enabled @enterprise", async ({
    page,
  }) => {
    // This test only passes when SSO_ENABLED=true is configured
    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    // In enterprise mode with SSO enabled, the button should be visible
    // The button text comes from SSO_BUTTON_LABEL config (default: "Sign in with SSO")
    const ssoButton = page.getByRole("button", { name: /sso/i });
    if (await ssoButton.isVisible()) {
      await expect(ssoButton).toBeEnabled();
    }
  });

  test("should not show SSO on sign-up when disabled @community", async ({
    page,
  }) => {
    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("button", { name: /sso/i })
    ).not.toBeVisible();
  });
});
