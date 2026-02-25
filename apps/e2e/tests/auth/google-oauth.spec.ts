import { expect, test } from "../../fixtures/test-base.js";

test.describe("Google OAuth Visibility @p1", () => {
  test("should not show Google login button in community mode @community", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");
    // In community mode with ENABLE_OAUTH=false, the Google button should not appear
    await expect(
      page.getByRole("button", { name: /google/i })
    ).not.toBeVisible();
  });

  test("should not show Google login on sign-up in community mode @community", async ({
    page,
  }) => {
    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");
    await expect(
      page.getByRole("button", { name: /google/i })
    ).not.toBeVisible();
  });
});
