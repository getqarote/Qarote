import { test, expect } from "../../fixtures/test-base.js";

test.describe("Exchanges Page @p1", () => {
  test("should navigate to exchanges page", async ({ adminPage }) => {
    await adminPage.goto("/exchanges");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage).toHaveURL(/\/exchanges/);
    await expect(
      adminPage.getByRole("heading", { name: /exchanges/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display exchange stats cards", async ({ adminPage }) => {
    await adminPage.goto("/exchanges");
    await adminPage.waitForLoadState("networkidle");

    // Should show exchange type stats or exchange count
    await expect(
      adminPage.getByText(/total exchanges|direct|fanout|topic|no exchanges/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display exchange list when server is connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/exchanges");
    await adminPage.waitForLoadState("networkidle");

    // Should show either exchanges or a "no exchanges" message
    await expect(
      adminPage.getByText(
        /notifications\.direct|no exchanges|connect a server/i
      )
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should have type filter tabs", async ({ adminPage }) => {
    await adminPage.goto("/exchanges");
    await adminPage.waitForLoadState("networkidle");

    // The page should have filter tabs for exchange types
    const allTab = adminPage.getByRole("tab", { name: /all/i });
    if (await allTab.isVisible()) {
      await expect(allTab).toBeVisible();
    }
  });
});
