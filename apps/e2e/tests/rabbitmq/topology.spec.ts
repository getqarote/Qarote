import { test, expect } from "../../fixtures/test-base.js";

test.describe("Topology Page @p1", () => {
  test("should navigate to topology page", async ({ adminPage }) => {
    await adminPage.goto("/topology");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/topology/);
    await expect(
      adminPage.getByRole("heading", { name: /topology/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/topology");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show page subtitle", async ({ adminPage }) => {
    await adminPage.goto("/topology");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/visual map of exchanges/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show topology link in sidebar", async ({ adminPage }) => {
    await adminPage.goto("/topology");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("link", { name: /topology/i })
    ).toBeVisible({ timeout: 15_000 });
  });
});
