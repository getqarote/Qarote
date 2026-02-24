import { test, expect } from "../../fixtures/test-base.js";

test.describe("Workspace Member Management @p1", () => {
  test("should navigate to profile/team tab as admin", async ({
    adminPage,
  }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("networkidle");

    // Click the Team tab
    const teamTab = adminPage.getByRole("tab", { name: /team/i });
    await expect(teamTab).toBeVisible({ timeout: 10_000 });
    await teamTab.click();

    // Should show team management content
    await expect(
      adminPage.getByText(/team|members|invite/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show team tab as disabled for readonly users", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/profile");
    await readonlyPage.waitForLoadState("networkidle");

    // Team tab should be disabled for non-admin users
    const teamTab = readonlyPage.getByRole("tab", { name: /team/i });
    await expect(teamTab).toBeVisible({ timeout: 10_000 });
    await expect(teamTab).toBeDisabled();
  });

  test("should show current members in team tab", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("networkidle");

    const teamTab = adminPage.getByRole("tab", { name: /team/i });
    await teamTab.click();

    // Should show the seeded admin and readonly users
    await expect(
      adminPage.getByText("admin@e2e-test.local")
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.getByText("readonly@e2e-test.local")
    ).toBeVisible();
  });

  test("should show profile tabs (personal info, workspace, plans)", async ({
    adminPage,
  }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.getByRole("tab", { name: /personal info/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.getByRole("tab", { name: /workspace/i })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("tab", { name: /plans/i })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("tab", { name: /feedback/i })
    ).toBeVisible();
  });
});
