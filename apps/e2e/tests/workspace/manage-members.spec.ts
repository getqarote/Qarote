import { test, expect } from "../../fixtures/test-base.js";

test.describe("Workspace Member Management @p1", () => {
  test("should navigate to team section as admin", async ({ adminPage }) => {
    await adminPage.goto("/settings/team");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should show team overview content
    await expect(adminPage.getByText(/team overview/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should show current members in team section", async ({ adminPage }) => {
    await adminPage.goto("/settings/team");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should show the seeded admin and readonly users
    await expect(
      adminPage.getByText("admin@e2e-test.local").first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.getByText("readonly@e2e-test.local").first()
    ).toBeVisible();
  });

  test("should show settings sidebar navigation", async ({ adminPage }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should show the settings secondary navigation links
    await expect(adminPage.getByRole("link", { name: /profile/i })).toBeVisible(
      { timeout: 10_000 }
    );
    await expect(
      adminPage.getByRole("link", { name: /workspace/i })
    ).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /plans/i })).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /team/i })).toBeVisible();
    await expect(
      adminPage.getByRole("link", { name: /feedback/i })
    ).toBeVisible();
  });
});
