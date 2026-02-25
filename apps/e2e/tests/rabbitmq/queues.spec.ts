import { test, expect } from "../../fixtures/test-base.js";

test.describe("Queue Viewing @p0", () => {
  test("should navigate to queues page", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/queues/);
    await expect(
      adminPage.getByRole("heading", { name: /queues/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
