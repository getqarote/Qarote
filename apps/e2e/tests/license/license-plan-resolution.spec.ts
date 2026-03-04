import fs from "node:fs";
import path from "node:path";

import { test, expect } from "../../fixtures/test-base.js";
import {
  generateTestLicenseJwt,
  ALL_PREMIUM_FEATURES,
} from "../../helpers/license.js";

const AUTH_TOKENS_FILE = path.resolve(
  import.meta.dirname,
  "../../.auth-tokens.json"
);

function getAdminToken(): string {
  const raw = fs.readFileSync(AUTH_TOKENS_FILE, "utf-8");
  const tokens = JSON.parse(raw);
  return tokens["admin@e2e-test.local"].token;
}

test.describe("License Plan Resolution @p1", () => {
  // Deactivate via API to invalidate the in-memory license cache (60s TTL),
  // then clear DB as a safety net.
  test.beforeEach(async ({ api, db }) => {
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.deactivate", {})
      .catch(() => {});
    await db.clearSystemSetting("license_jwt");
  });

  test.afterEach(async ({ api, db }) => {
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.deactivate", {})
      .catch(() => {});
    await db.clearSystemSetting("license_jwt");
  });

  test("should show Free plan badge when no license is active", async ({
    adminPage,
  }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    // PlanBadge should display "Free"
    await expect(adminPage.getByText("Free")).toBeVisible({ timeout: 15_000 });
  });

  test("should show Developer plan badge after DEVELOPER license activation", async ({
    adminPage,
    api,
  }) => {
    // Activate a DEVELOPER license via API
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ALL_PREMIUM_FEATURES,
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    // Navigate to dashboard
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    // PlanBadge should display "Developer" instead of "Free"
    await expect(adminPage.getByText("Developer")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should not show 'Unlock premium features' after license activation", async ({
    adminPage,
    api,
  }) => {
    // Activate a DEVELOPER license via API
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ALL_PREMIUM_FEATURES,
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    // Navigate to profile plans tab
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // Click the Plans tab
    const plansTab = adminPage.getByRole("tab", { name: /plans/i });
    await expect(plansTab).toBeVisible();
    await plansTab.click();

    // Should NOT show "Unlock premium features" prompt
    await expect(
      adminPage.getByText(/unlock premium features/i)
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("should show correct plan features for DEVELOPER license", async ({
    api,
  }) => {
    // Activate a DEVELOPER license via API
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ALL_PREMIUM_FEATURES,
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    // Query getCurrentPlan directly to verify API returns DEVELOPER
    const planData = await api
      .withAuth(token)
      .query("workspace.plan.getCurrentPlan");

    expect(planData.user.plan).toBe("DEVELOPER");
    expect(planData.planFeatures.displayName).toBe("Developer");
    expect(planData.planFeatures.maxServers).toBe(2);
    expect(planData.planFeatures.canInviteUsers).toBe(true);
  });

  test("should revert to Free plan after license deactivation", async ({
    api,
  }) => {
    const token = getAdminToken();

    // Activate a DEVELOPER license
    const jwt = await generateTestLicenseJwt({
      tier: "DEVELOPER",
      features: ALL_PREMIUM_FEATURES,
    });
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    // Verify plan is DEVELOPER
    let planData = await api
      .withAuth(token)
      .query("workspace.plan.getCurrentPlan");
    expect(planData.user.plan).toBe("DEVELOPER");

    // Deactivate
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.deactivate", {});

    // Verify plan reverts to FREE
    planData = await api
      .withAuth(token)
      .query("workspace.plan.getCurrentPlan");
    expect(planData.user.plan).toBe("FREE");
    expect(planData.planFeatures.displayName).toBe("Free");
  });

  test("should show Enterprise plan for ENTERPRISE license", async ({
    api,
  }) => {
    const jwt = await generateTestLicenseJwt({
      tier: "ENTERPRISE",
      features: ALL_PREMIUM_FEATURES,
    });
    const token = getAdminToken();
    await api
      .withAuth(token)
      .mutation("selfhostedLicense.activate", { licenseKey: jwt });

    const planData = await api
      .withAuth(token)
      .query("workspace.plan.getCurrentPlan");

    expect(planData.user.plan).toBe("ENTERPRISE");
    expect(planData.planFeatures.displayName).toBe("Enterprise");
    expect(planData.planFeatures.maxServers).toBeNull(); // unlimited
    expect(planData.planFeatures.hasPrioritySupport).toBe(true);
  });
});
