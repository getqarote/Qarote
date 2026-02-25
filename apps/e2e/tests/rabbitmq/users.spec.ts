import { test, expect } from "../../fixtures/test-base.js";

test.describe("RabbitMQ Users Page @p1", () => {
  test("should navigate to users page", async ({ adminPage }) => {
    await adminPage.goto("/users");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/users/);
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/users");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
