import { test, expect } from "../../fixtures/test-base.js";

test.describe("Alerts Page @p1", () => {
  // Ensure no license is active before each test so paywall assertions are reliable
  test.beforeEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test("should navigate to alerts page", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/alerts/);
  });

  test("should show premium feature paywall without license", async ({
    adminPage,
  }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    // Without a license, alerts is a premium feature behind a paywall
    await expect(
      adminPage.getByText(/activate a license to unlock/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show upgrade options", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /activate license/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      adminPage.getByRole("button", { name: /purchase license/i })
    ).toBeVisible();
  });
});
