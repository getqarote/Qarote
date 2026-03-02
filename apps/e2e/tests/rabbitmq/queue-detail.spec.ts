import { test, expect } from "../../fixtures/test-base.js";

test.describe("Queue Detail Page @p2", () => {
  test("should show queues page heading", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("heading", { name: /queues/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state on queues page", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
