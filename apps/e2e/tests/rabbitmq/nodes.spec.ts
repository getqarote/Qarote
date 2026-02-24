import { test, expect } from "../../fixtures/test-base.js";

test.describe("Nodes Page @p1", () => {
  test("should navigate to nodes page", async ({ adminPage }) => {
    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage).toHaveURL(/\/nodes/);
    await expect(
      adminPage.getByRole("heading", { name: /nodes/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display node information or prompt to connect", async ({
    adminPage,
  }) => {
    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("networkidle");

    // Should show node details or a prompt to select/add a server
    await expect(
      adminPage.getByText(
        /nodes|cluster|select.*server|add.*server|metrics/i
      )
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show subtitle about cluster nodes", async ({ adminPage }) => {
    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.getByText(/cluster.*nodes|nodes.*metrics|detailed view/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
