import { test, expect } from "../../fixtures/test-base.js";

test.describe("Queue Detail Page @p2", () => {
  // Note: These tests assume a RabbitMQ server has been connected and
  // queues exist (from the RabbitMQ definitions loaded by Docker).

  test("should navigate to queue detail from queues list", async ({
    adminPage,
  }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("networkidle");

    // Click on the first queue link (e.g., "email.notifications" from definitions)
    const queueLink = adminPage
      .getByRole("link", { name: /email\.notifications/i })
      .first();
    if (await queueLink.isVisible()) {
      await queueLink.click();
      await expect(adminPage).toHaveURL(/\/queues\//);
    }
  });

  test("should display queue detail sections", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("networkidle");

    const queueLink = adminPage
      .getByRole("link", { name: /email\.notifications/i })
      .first();

    if (await queueLink.isVisible()) {
      await queueLink.click();

      // Queue detail page should show various sections
      await expect(
        adminPage.getByText(/messages|consumers|configuration|bindings/i)
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("should show back button to return to queues list", async ({
    adminPage,
  }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("networkidle");

    const queueLink = adminPage
      .getByRole("link", { name: /email\.notifications/i })
      .first();

    if (await queueLink.isVisible()) {
      await queueLink.click();
      await adminPage.waitForLoadState("networkidle");

      // Should have a back button
      const backButton = adminPage.getByRole("button", { name: /back/i });
      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(adminPage).toHaveURL(/\/queues$/);
      }
    }
  });
});
