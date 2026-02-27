import fs from "node:fs";
import path from "node:path";

import { test, expect } from "../../fixtures/test-base.js";
import { generateTestLicenseJwt } from "../../helpers/license.js";

const AUTH_TOKENS_FILE = path.resolve(import.meta.dirname, "../../.auth-tokens.json");

function getAdminToken(): string {
  const raw = fs.readFileSync(AUTH_TOKENS_FILE, "utf-8");
  const tokens = JSON.parse(raw);
  return tokens["admin@e2e-test.local"].token;
}

test.describe("License Feature Gating @p1", () => {
  // Ensure no license is active before each test
  test.beforeEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  // Clean up after each test
  test.afterEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test("should show paywall for premium features without license", async ({
    adminPage,
  }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should show the upgrade prompt with selfhosted-specific CTAs
    await expect(
      adminPage.getByText(/premium feature/i)
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      adminPage.getByRole("button", { name: /activate license/i })
    ).toBeVisible();
  });

  test("should unlock premium features after license activation", async ({
    adminPage,
    api,
  }) => {
    // Activate a license with the alerting feature via API
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ["alerting"],
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    // Navigate to alerts page
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    // The paywall should NOT be visible — feature is unlocked
    await expect(
      adminPage.getByText(/activate a license to unlock/i)
    ).not.toBeVisible({ timeout: 15_000 });
  });

  test("should re-gate features after license deactivation", async ({
    adminPage,
    api,
  }) => {
    // First activate a license
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ["alerting"],
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    // Deactivate it
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.deactivate", {});

    // Navigate to alerts page
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("domcontentloaded");

    // The paywall should be visible again
    await expect(
      adminPage.getByText(/activate a license to unlock/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
