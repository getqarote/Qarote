import { expect, test } from "../../fixtures/test-base.js";

test.describe("SSO Visibility @p2", () => {
  test("should not show SSO button when SSO is disabled @selfhosted", async ({
    page,
  }) => {
    test.skip(
      process.env.ENABLE_SSO === "true",
      "SSO is enabled — skipping disabled check"
    );

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    // SSO button should not be visible when SSO is disabled
    await expect(
      page.getByRole("button", { name: /sso/i })
    ).not.toBeVisible();
  });

  test("should show SSO button when SSO is enabled @selfhosted-licensed", async ({
    page,
  }) => {
    test.skip(
      process.env.ENABLE_SSO !== "true",
      "SSO only available when ENABLE_SSO=true"
    );

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    const ssoButton = page.getByRole("button", { name: /sso/i });
    await expect(ssoButton).toBeVisible({ timeout: 10_000 });
    await expect(ssoButton).toBeEnabled();
  });

  test("should not show SSO on sign-up when disabled @selfhosted", async ({
    page,
  }) => {
    test.skip(
      process.env.ENABLE_SSO === "true",
      "SSO is enabled — skipping disabled check"
    );

    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("button", { name: /sso/i })
    ).not.toBeVisible();
  });
});
