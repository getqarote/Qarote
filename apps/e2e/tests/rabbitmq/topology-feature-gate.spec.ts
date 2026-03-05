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

test.describe("Topology Feature Gating @p1", () => {
  test.beforeEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test.afterEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test("should show paywall for topology without license", async ({
    adminPage,
  }) => {
    await adminPage.goto("/topology");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/premium feature/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should unlock topology after license with topology_visualization feature", async ({
    adminPage,
    api,
  }) => {
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ["topology_visualization"],
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    await adminPage.goto("/topology");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/activate a license to unlock/i)
    ).not.toBeVisible({ timeout: 15_000 });
  });
});
