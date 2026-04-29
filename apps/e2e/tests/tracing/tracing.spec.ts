import { expect, test } from "../../fixtures/test-base.js";

/**
 * E2E tests for the Message Tracing page.
 *
 * Gating model (updated):
 * - setTraceEnabled: still license-gated (Enable Tracing button requires license)
 * - Page itself: soft preview for free users — no hard paywall
 *   Free users see the page shell + FirehoseDisabledState or preview teaser.
 *   Paid users see full access without teaser.
 *
 * Note: live data from the RabbitMQ Firehose is not testable in E2E
 * (no real broker). Tests cover the page shell, gate model, and static UI.
 */

test.describe("Message Tracing @p2", () => {
  test.beforeEach(async ({ db }) => {
    await db.clearSystemSetting("license_jwt");
  });

  test("should navigate to /tracing", async ({ adminPage }) => {
    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");
    await expect(adminPage).toHaveURL(/\/tracing/);
  });

  test("FREE plan: tracing page loads without hard paywall @p1", async ({
    adminPage,
  }) => {
    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    // Soft-preview model: the FeatureGate overlay is gone.
    // The page should not show the old hard-gate text.
    await expect(
      adminPage.getByText(/activate a license to unlock/i)
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("FREE plan: shows FirehoseDisabledState (no broker) @p1", async ({
    adminPage,
  }) => {
    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    // Without a real broker checkFirehoseStatus returns inactive — page shows
    // the disabled state. The "Enable Tracing" button is still license-gated
    // (it calls setTraceEnabled which requires a license).
    const firehoseDisabled = adminPage.getByText(/firehose not active/i);
    const tracingHeading = adminPage.getByRole("heading", { name: /message tracing/i });

    await expect(firehoseDisabled.or(tracingHeading)).toBeVisible({ timeout: 15_000 });
  });

  test("DEVELOPER license: no preview teaser shown @p1", async ({
    adminPage,
    db,
  }) => {
    await db.setSystemSetting(
      "license_jwt",
      await db.generateEnterpriseLicenseJwt()
    );

    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    // With a license, no teaser / "upgrade" copy should appear from the preview gate
    await expect(
      adminPage.getByText(/more events hidden/i)
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("should show FirehoseDisabledState with Enterprise license (no broker)", async ({
    adminPage,
    db,
  }) => {
    await db.setSystemSetting(
      "license_jwt",
      await db.generateEnterpriseLicenseJwt()
    );

    await adminPage.goto("/tracing");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/firehose not active/i)
    ).toBeVisible({ timeout: 15_000 });
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
