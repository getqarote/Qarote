import { test, expect } from "../../fixtures/test-base.js";

test.describe("Connections Page @p1", () => {
  test("should navigate to connections page", async ({ adminPage }) => {
    await adminPage.goto("/connections");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/connections/);
    await expect(
      adminPage.getByRole("heading", { name: /connections/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/connections");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
