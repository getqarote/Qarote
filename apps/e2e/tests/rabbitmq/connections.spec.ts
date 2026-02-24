import { test, expect } from "../../fixtures/test-base.js";

test.describe("Connections Page @p1", () => {
  test("should navigate to connections page", async ({ adminPage }) => {
    await adminPage.goto("/connections");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage).toHaveURL(/\/connections/);
    await expect(
      adminPage.getByRole("heading", { name: /connections/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display connection stats", async ({ adminPage }) => {
    await adminPage.goto("/connections");
    await adminPage.waitForLoadState("networkidle");

    // Should show connection stats or "no connections" state
    await expect(
      adminPage.getByText(
        /total connections|no.*connections|channels|connect a server/i
      )
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show subtitle about monitoring", async ({ adminPage }) => {
    await adminPage.goto("/connections");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.getByText(/monitor.*connections|connections.*channels/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
