import { test, expect } from "../../fixtures/test-base.js";

test.describe("Alerts Page @p1", () => {
  test("should navigate to alerts page", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/alerts/);
  });

  test("should show premium feature paywall in community mode", async ({
    adminPage,
  }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    // In community mode, alerts is a premium feature behind a paywall
    // "Upgrade to Enterprise Edition to unlock Alerting System."
    await expect(
      adminPage.getByText(/upgrade to enterprise edition/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show upgrade options", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /view plans/i }).or(
        adminPage.getByRole("link", { name: /view plans/i })
      )
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      adminPage.getByRole("button", { name: /contact sales/i }).or(
        adminPage.getByRole("link", { name: /contact sales/i })
      )
    ).toBeVisible();
  });
});
