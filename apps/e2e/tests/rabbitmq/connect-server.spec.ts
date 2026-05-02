import { test, expect } from "../../fixtures/test-base.js";

test.describe("Connect RabbitMQ Server @p0", () => {
  test("should show add server prompt when no server connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    // The dashboard should show "No RabbitMQ Server Configured"
    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      adminPage.getByRole("main").getByRole("button", { name: /add server/i })
    ).toBeVisible();
  });

  test("should show add server button in sidebar", async ({ adminPage }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    // Sidebar should show "Add Server" when no server is configured
    await expect(adminPage.getByText(/no servers configured/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
