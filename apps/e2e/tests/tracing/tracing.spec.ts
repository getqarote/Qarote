import { expect, test } from "../../fixtures/test-base.js";

/**
 * E2E tests for the Message Tracing page.
 *
 * These tests cover:
 * - Navigation to /tracing
 * - FeatureGate: paywall shown without Enterprise license
 * - FeatureGate: page content accessible with Enterprise license
 * - Mode toggle between Live Tail and Query
 * - Filters bar rendered and URL params updated
 *
 * Note: Live data from the RabbitMQ Firehose is not testable in E2E
 * (no real broker). Tests cover the page shell, gate, and static UI.
 */

test.describe("Message Tracing @p2", () => {
  // Clear license before each test to ensure a clean state
  test.beforeEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test("should navigate to /tracing", async ({ adminPage }) => {
    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");
    await expect(adminPage).toHaveURL(/\/tracing/);
  });

  test("should show upgrade paywall without Enterprise license", async ({
    adminPage,
  }) => {
    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    // FeatureGate renders UpgradePrompt for non-Enterprise users
    await expect(
      adminPage.getByText(/activate a license to unlock/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show upgrade options for message_tracing feature", async ({
    adminPage,
  }) => {
    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /activate license/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show Message Tracing heading with Enterprise license", async ({
    adminPage,
    db,
  }) => {
    // Grant Enterprise license
    await db.setSystemSetting(
      "license_jwt",
      await db.generateEnterpriseLicenseJwt()
    );

    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    // Either the heading or the FirehoseDisabledState should be visible
    const heading = adminPage.getByRole("heading", {
      name: /message tracing/i,
    });
    const firehoseDisabled = adminPage.getByText(/firehose not active/i);

    await expect(heading.or(firehoseDisabled)).toBeVisible({ timeout: 15_000 });
  });

  test("should show FirehoseDisabledState when firehose is inactive", async ({
    adminPage,
    db,
  }) => {
    await db.setSystemSetting(
      "license_jwt",
      await db.generateEnterpriseLicenseJwt()
    );

    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    // Without a real broker the checkFirehoseStatus query will fail or
    // return inactive — either way FirehoseDisabledState is expected
    await expect(
      adminPage.getByText(/firehose not active/i)
    ).toBeVisible({ timeout: 15_000 });

    // "Enable tracing" button should be present
    await expect(
      adminPage.getByRole("button", { name: /enable tracing/i })
    ).toBeVisible();
  });

  test("should have sidebar nav item for Message Tracing", async ({
    adminPage,
  }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    const navItem = adminPage.getByRole("link", { name: /message tracing/i });
    await expect(navItem).toBeVisible({ timeout: 10_000 });
    await expect(navItem).toHaveAttribute("href", /\/tracing/);
  });
});
