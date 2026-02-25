import { test, expect } from "../../fixtures/test-base.js";

test.describe("Virtual Hosts Page @p1", () => {
  test("should navigate to vhosts page", async ({ adminPage }) => {
    await adminPage.goto("/vhosts");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/vhosts/);
    await expect(
      adminPage.getByRole("heading", { name: /virtual hosts/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/vhosts");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
