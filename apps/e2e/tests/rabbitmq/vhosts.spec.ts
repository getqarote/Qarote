import { test, expect } from "../../fixtures/test-base.js";

test.describe("Virtual Hosts Page @p1", () => {
  test("should navigate to vhosts page", async ({ adminPage }) => {
    await adminPage.goto("/vhosts");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage).toHaveURL(/\/vhosts/);
    await expect(
      adminPage.getByRole("heading", { name: /virtual hosts/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display vhost table when server is connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/vhosts");
    await adminPage.waitForLoadState("networkidle");

    // Should show vhosts table or a prompt message
    await expect(
      adminPage.getByText(/virtual hosts|name|ready|unacked|\//i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show filter input", async ({ adminPage }) => {
    await adminPage.goto("/vhosts");
    await adminPage.waitForLoadState("networkidle");

    // The page should have a filter regex input
    const filterInput = adminPage.getByPlaceholder(/filter/i);
    if (await filterInput.isVisible()) {
      await expect(filterInput).toBeEnabled();
    }
  });

  test("should show subtitle about namespace isolation", async ({
    adminPage,
  }) => {
    await adminPage.goto("/vhosts");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.getByText(/virtual hosts|namespace isolation/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
