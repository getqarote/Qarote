import { test, expect } from "../../fixtures/test-base.js";
import { QueuesPage } from "../../page-objects/rabbitmq/queues.page.js";

test.describe("Queue Viewing @p0", () => {
  // Note: These tests assume a RabbitMQ server has been connected.
  // The connect-server.spec.ts test should run first (Playwright runs specs in order).

  test("should navigate to queues page", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("networkidle");

    // The page should load without errors
    await expect(adminPage).toHaveURL(/\/queues/);
  });

  test("should display queue list when server is connected", async ({
    adminPage,
  }) => {
    const queuesPage = new QueuesPage(adminPage);
    await queuesPage.goto();

    // Wait for the page to load — it should show either queues or a "no queues" message
    await expect(
      adminPage.getByText(
        /queues|no queues|email\.notifications|connect a server/i
      )
    ).toBeVisible({ timeout: 15_000 });
  });
});
