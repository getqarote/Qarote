import { test, expect } from "../../fixtures/test-base.js";

test.describe("Profile Management @p2", () => {
  test("should display profile page", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("heading", { name: /profile/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show personal info tab by default", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    const personalInfoTab = adminPage.getByRole("tab", {
      name: /personal info/i,
    });
    await expect(personalInfoTab).toBeVisible({ timeout: 10_000 });

    // Should show the admin user's email
    await expect(
      adminPage.getByText("admin@e2e-test.local").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show workspace tab", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    const workspaceTab = adminPage.getByRole("tab", { name: /workspace/i });
    await expect(workspaceTab).toBeVisible({ timeout: 10_000 });
    await workspaceTab.click();

    await expect(
      adminPage.getByText(/e2e test workspace/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show plans tab", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    const plansTab = adminPage.getByRole("tab", { name: /plans/i });
    await expect(plansTab).toBeVisible({ timeout: 10_000 });
    await plansTab.click();

    await expect(
      adminPage.getByText(/free|developer|enterprise|plan/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show send feedback tab", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    const feedbackTab = adminPage.getByRole("tab", { name: /send feedback/i });
    await expect(feedbackTab).toBeVisible({ timeout: 10_000 });
    await feedbackTab.click();
  });

  test("readonly user should see profile page", async ({ readonlyPage }) => {
    await readonlyPage.goto("/profile");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await expect(
      readonlyPage.getByRole("heading", { name: /profile/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      readonlyPage.getByText("readonly@e2e-test.local").first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
