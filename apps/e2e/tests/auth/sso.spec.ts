import { expect, test } from "../../fixtures/test-base.js";

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
    test.skip(
      process.env.DEPLOYMENT_MODE !== "enterprise",
      "SSO only available in enterprise mode"
    );

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    const ssoButton = page.getByRole("button", { name: /sso/i });
    await expect(ssoButton).toBeVisible({ timeout: 10_000 });
    await expect(ssoButton).toBeEnabled();
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
