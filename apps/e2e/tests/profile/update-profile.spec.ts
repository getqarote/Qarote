import { test, expect } from "../../fixtures/test-base.js";

test.describe("Profile Management @p2", () => {
  test("should display settings page with profile section", async ({ adminPage }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("heading", { name: /settings/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show personal info by default on profile section", async ({ adminPage }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should show the admin user's email
    await expect(
      adminPage.getByText("admin@e2e-test.local").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to workspace section", async ({ adminPage }) => {
    await adminPage.goto("/settings/workspace");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/e2e test workspace/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to plans section", async ({ adminPage }) => {
    await adminPage.goto("/settings/plans");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/free|developer|enterprise|plan/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to feedback section", async ({ adminPage }) => {
    await adminPage.goto("/settings/feedback");
    await adminPage.waitForLoadState("domcontentloaded");

    // Feedback form should be visible
    await expect(
      adminPage.locator("form, textarea").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("readonly user should see profile section", async ({ readonlyPage }) => {
    await readonlyPage.goto("/settings/profile");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await expect(
      readonlyPage.getByRole("heading", { name: /settings/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      readonlyPage.getByText("readonly@e2e-test.local").first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
