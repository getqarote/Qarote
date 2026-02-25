import { test, expect } from "../../fixtures/test-base.js";

test.describe("Workspace Member Management @p1", () => {
  test("should navigate to profile/team tab as admin", async ({
    adminPage,
  }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    const teamTab = adminPage.getByRole("tab", { name: /team/i });
    await expect(teamTab).toBeVisible({ timeout: 10_000 });
    await teamTab.click();

    // Should show team overview content
    await expect(
      adminPage.getByText(/team overview/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show current members in team tab", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    const teamTab = adminPage.getByRole("tab", { name: /team/i });
    await teamTab.click();

    // Should show the seeded admin and readonly users
    await expect(
      adminPage.getByText("admin@e2e-test.local").first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      adminPage.getByText("readonly@e2e-test.local").first()
    ).toBeVisible();
  });

  test("should show all profile tabs", async ({ adminPage }) => {
    await adminPage.goto("/profile");
    await adminPage.waitForLoadState("domcontentloaded");

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
      adminPage.getByRole("tab", { name: /team/i })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("tab", { name: /send feedback/i })
    ).toBeVisible();
  });
});
