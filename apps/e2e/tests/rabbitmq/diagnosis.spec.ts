import { expect, test } from "../../fixtures/test-base.js";

/**
 * E2E tests for the Incident Diagnosis page.
 *
 * Gating model:
 * - Free users: page loads (no hard paywall), sees partial findings + teaser
 * - Paid users: full findings, no teaser
 *
 * Note: no real broker or metric snapshots available in E2E.
 * Tests cover gate behaviour and static UI — not actual diagnosis content.
 */

test.describe("Incident Diagnosis @p1", () => {
  test.beforeEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test("FREE plan: diagnosis page loads without hard paywall", async ({
    adminPage,
  }) => {
    await adminPage.goto("/diagnosis");
    await adminPage.waitForLoadState("domcontentloaded");

    // Confirm the page content actually rendered before asserting absence
    await expect(
      adminPage.getByRole("heading", { name: /incident diagnosis/i })
    ).toBeVisible({ timeout: 10_000 });

    // Soft-preview model: old hard-gate overlay must not appear
    await expect(
      adminPage.getByText(/activate a license to unlock/i)
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("FREE plan: page renders without FORBIDDEN error", async ({
    adminPage,
  }) => {
    await adminPage.goto("/diagnosis");
    await adminPage.waitForLoadState("domcontentloaded");

    // Confirm the page content actually rendered before asserting absence
    await expect(
      adminPage.getByRole("heading", { name: /incident diagnosis/i })
    ).toBeVisible({ timeout: 10_000 });

    // Page must not show a generic FORBIDDEN / access-denied error
    await expect(adminPage.getByText(/forbidden/i)).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("DEVELOPER license: diagnosis page accessible, no teaser @p1", async ({
    adminPage,
    db,
  }) => {
    await db.setSystemSetting(
      "license_jwt",
      await db.generateDeveloperLicenseJwt()
    );

    await adminPage.goto("/diagnosis");
    await adminPage.waitForLoadState("domcontentloaded");

    // No preview teaser should appear for paid users
    await expect(adminPage.getByText(/more findings hidden/i)).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("diagnosis page is navigable from sidebar @p2", async ({
    adminPage,
  }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    const navItem = adminPage.getByRole("link", { name: /diagnosis/i });
    await expect(navItem).toBeVisible();
    await expect(navItem).toHaveAttribute("href", /\/diagnosis/);
  });
});
