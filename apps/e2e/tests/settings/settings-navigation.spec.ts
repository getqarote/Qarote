import { test, expect } from "../../fixtures/test-base.js";

test.describe("Settings Navigation @p2", () => {
  test("should redirect /settings to /settings/profile", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/settings\/profile/);
  });

  test("should show settings sidebar with correct groups for admin", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // Personal group links
    await expect(adminPage.getByRole("link", { name: /profile/i })).toBeVisible(
      { timeout: 10_000 }
    );
    await expect(
      adminPage.getByRole("link", { name: /workspace/i })
    ).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /plans/i })).toBeVisible();

    // Administration group links (admin only)
    await expect(adminPage.getByRole("link", { name: /team/i })).toBeVisible();
    await expect(
      adminPage.getByRole("link", { name: /license/i })
    ).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /sso/i })).toBeVisible();
    await expect(adminPage.getByRole("link", { name: /email/i })).toBeVisible();

    // Feedback
    await expect(
      adminPage.getByRole("link", { name: /feedback/i })
    ).toBeVisible();
  });

  test("should hide admin-only sections for readonly user", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/settings/profile");
    await readonlyPage.waitForLoadState("domcontentloaded");

    // Personal group should be visible
    await expect(
      readonlyPage.getByRole("link", { name: /profile/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      readonlyPage.getByRole("link", { name: /workspace/i })
    ).toBeVisible();
    await expect(
      readonlyPage.getByRole("link", { name: /plans/i })
    ).toBeVisible();

    // Administration links should NOT be visible for readonly user
    await expect(
      readonlyPage.getByRole("link", { name: /^team$/i })
    ).not.toBeVisible();
    await expect(
      readonlyPage.getByRole("link", { name: /^license$/i })
    ).not.toBeVisible();
  });

  test("should navigate between sections via sidebar links", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for settings page to load
    await expect(
      adminPage.getByRole("heading", { name: /settings/i })
    ).toBeVisible({ timeout: 15_000 });

    // Click workspace link
    await adminPage.getByRole("link", { name: /workspace/i }).click();
    await expect(adminPage).toHaveURL(/\/settings\/workspace/);

    // Click plans link
    await adminPage.getByRole("link", { name: /plans/i }).click();
    await expect(adminPage).toHaveURL(/\/settings\/plans/);

    // Click team link
    await adminPage.getByRole("link", { name: /team/i }).click();
    await expect(adminPage).toHaveURL(/\/settings\/team/);

    // Click feedback link
    await adminPage.getByRole("link", { name: /feedback/i }).click();
    await expect(adminPage).toHaveURL(/\/settings\/feedback/);
  });

  test("should highlight active section in sidebar", async ({ adminPage }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // The profile link should have the active styling (gradient background)
    const profileLink = adminPage.getByRole("link", { name: /profile/i });
    await expect(profileLink).toBeVisible({ timeout: 10_000 });
    await expect(profileLink).toHaveClass(/from-orange-600/);

    // Navigate to workspace and check active state moves
    await adminPage.getByRole("link", { name: /workspace/i }).click();
    const workspaceLink = adminPage.getByRole("link", { name: /workspace/i });
    await expect(workspaceLink).toHaveClass(/from-orange-600/);
  });

  test("main sidebar should highlight settings on any settings sub-route", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/team");
    await adminPage.waitForLoadState("domcontentloaded");

    // The main sidebar Settings item should be highlighted
    const settingsMenuItem = adminPage
      .locator("[data-sidebar='menu-button']")
      .filter({ hasText: /settings|paramètres/i });
    await expect(settingsMenuItem).toHaveClass(/from-orange-600/, {
      timeout: 10_000,
    });
  });
});
