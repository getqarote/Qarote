import fs from "node:fs";
import path from "node:path";

import { test, expect } from "../../fixtures/test-base.js";
import { generateTestLicenseJwt, ALL_PREMIUM_FEATURES } from "../../helpers/license.js";

const AUTH_TOKENS_FILE = path.resolve(import.meta.dirname, "../../.auth-tokens.json");

function getAdminToken(): string {
  const raw = fs.readFileSync(AUTH_TOKENS_FILE, "utf-8");
  const tokens = JSON.parse(raw);
  return tokens["admin@e2e-test.local"].token;
}

test.describe("License Page @p1", () => {
  // Clean up license after each test
  test.afterEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test("should navigate to license settings page", async ({ adminPage }) => {
    await adminPage.goto("/settings/license");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/settings\/license/);
    await expect(
      adminPage.getByRole("heading", { name: /license/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-license status when no license is active", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/license");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should show "No License" badge
    await expect(adminPage.getByText(/no license/i)).toBeVisible({
      timeout: 15_000,
    });

    // Should show activate textarea
    await expect(
      adminPage.getByPlaceholder(/paste your license key/i)
    ).toBeVisible();
  });

  test("should reject invalid license key", async ({ adminPage }) => {
    await adminPage.goto("/settings/license");
    await adminPage.waitForLoadState("domcontentloaded");

    // Type an invalid JWT
    await adminPage
      .getByPlaceholder(/paste your license key/i)
      .fill("invalid-jwt-garbage");

    // Click activate
    await adminPage
      .getByRole("button", { name: /activate license/i })
      .click();

    // Expect error toast
    await expect(
      adminPage.getByText(/invalid or expired/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should activate a valid license", async ({ adminPage }) => {
    await adminPage.goto("/settings/license");
    await adminPage.waitForLoadState("domcontentloaded");

    // Generate a valid test JWT
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ALL_PREMIUM_FEATURES,
    });

    // Paste the JWT
    await adminPage
      .getByPlaceholder(/paste your license key/i)
      .fill(jwt);

    // Click activate
    await adminPage
      .getByRole("button", { name: /activate license/i })
      .click();

    // Expect success toast
    await expect(
      adminPage.getByText(/license activated/i)
    ).toBeVisible({ timeout: 15_000 });

    // Expect "Active" badge
    await expect(adminPage.getByText("Active")).toBeVisible();
  });

  test("should deactivate an active license", async ({ adminPage, api }) => {
    // Activate via API first (skip UI)
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ALL_PREMIUM_FEATURES,
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    // Navigate to license page
    await adminPage.goto("/settings/license");
    await adminPage.waitForLoadState("domcontentloaded");

    // Verify active state
    await expect(adminPage.getByText("Active")).toBeVisible({
      timeout: 15_000,
    });

    // Click deactivate
    await adminPage
      .getByRole("button", { name: /deactivate license/i })
      .click();

    // Expect success toast
    await expect(
      adminPage.getByText(/license deactivated/i)
    ).toBeVisible({ timeout: 15_000 });

    // Expect "No License" badge
    await expect(adminPage.getByText(/no license/i)).toBeVisible();
  });
});
