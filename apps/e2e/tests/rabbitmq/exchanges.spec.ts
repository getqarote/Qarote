import { test, expect } from "../../fixtures/test-base.js";

test.describe("Exchanges Page @p1", () => {
  test("should navigate to exchanges page", async ({ adminPage }) => {
    await adminPage.goto("/exchanges");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/exchanges/);
    await expect(
      adminPage.getByRole("heading", { name: /exchanges/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/exchanges");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show page subtitle", async ({ adminPage }) => {
    await adminPage.goto("/exchanges");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/manage exchanges and routing/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
