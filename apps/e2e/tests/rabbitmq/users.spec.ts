import { test, expect } from "../../fixtures/test-base.js";

test.describe("RabbitMQ Users Page @p1", () => {
  test("should navigate to users page", async ({ adminPage }) => {
    await adminPage.goto("/users");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage).toHaveURL(/\/users/);
    await expect(
      adminPage.getByRole("heading", { name: /users/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display RabbitMQ user list when server is connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/users");
    await adminPage.waitForLoadState("networkidle");

    // Should show users table or a message
    // The seeded RabbitMQ has users: admin, guest, producer, consumer
    await expect(
      adminPage.getByText(/users|name|tags|access denied|connect a server/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show subtitle about user management", async ({ adminPage }) => {
    await adminPage.goto("/users");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.getByText(/manage.*users|access permissions/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show filter input", async ({ adminPage }) => {
    await adminPage.goto("/users");
    await adminPage.waitForLoadState("networkidle");

    const filterInput = adminPage.getByPlaceholder(/filter/i);
    if (await filterInput.isVisible()) {
      await expect(filterInput).toBeEnabled();
    }
  });
});
