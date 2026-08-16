import { test, expect } from "../../fixtures/test-base.js";

test.describe("Connect RabbitMQ Server @p0", () => {
  test("should show add server prompt when no server connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    // The agent-first home renders the first-run cockpit when no broker is
    // connected: a "Connect your first broker" heading + an "Add server" CTA.
    await expect(
      adminPage.getByRole("heading", { name: /connect your first broker/i })
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
