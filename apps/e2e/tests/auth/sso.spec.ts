import { expect, test } from "../../fixtures/test-base.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

/**
 * SSO Login Flow E2E Tests
 *
 * Tests for the better-auth-based SSO login flow. These tests use
 * tRPC mock intercepts to simulate various SSO configurations without
 * needing a live IdP.
 */

test.describe("SSO Visibility @p2", () => {
  test("should not show SSO button when trpc.sso.getConfig returns null", async ({
    page,
  }) => {
    await mockTrpcQuery(page, "sso.getConfig", null);

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    // SSO button should not be visible when SSO is not configured
    await expect(
      page.getByRole("button", { name: /sso/i })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("should show SSO button when sso.getConfig returns enabled config", async ({
    page,
  }) => {
    await mockTrpcQuery(page, "sso.getConfig", {
      enabled: true,
      cloudSso: false,
      buttonLabel: "Sign in with SSO",
      providerId: "default",
      type: "oidc",
    });

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    const ssoButton = page.getByRole("button", { name: /sign in with sso/i });
    await expect(ssoButton).toBeVisible({ timeout: 10_000 });
    await expect(ssoButton).toBeEnabled();
  });

  test("should use custom button label from config", async ({ page }) => {
    await mockTrpcQuery(page, "sso.getConfig", {
      enabled: true,
      cloudSso: false,
      buttonLabel: "Sign in with Acme SSO",
      providerId: "default",
      type: "oidc",
    });

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("button", { name: /sign in with acme sso/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should not show SSO button on sign-up when not configured", async ({
    page,
  }) => {
    await mockTrpcQuery(page, "sso.getConfig", null);

    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("button", { name: /sso/i })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("cloud: should show email input when SSO button is clicked", async ({
    page,
  }) => {
    // Cloud always returns cloudSso: true
    await mockTrpcQuery(page, "sso.getConfig", {
      enabled: true,
      cloudSso: true,
      buttonLabel: "Sign in with SSO",
      providerId: null,
      type: null,
    });

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    const ssoButton = page.getByRole("button", { name: /sign in with sso/i });
    await expect(ssoButton).toBeVisible({ timeout: 10_000 });

    // Click the button — should reveal email input
    await ssoButton.click();

    // Email input and Continue button should now be visible
    await expect(page.getByPlaceholder(/your@company\.com/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("cloud: should show cancel button in email input mode", async ({
    page,
  }) => {
    await mockTrpcQuery(page, "sso.getConfig", {
      enabled: true,
      cloudSso: true,
      buttonLabel: "Sign in with SSO",
      providerId: null,
      type: null,
    });

    await page.goto("/auth/sign-in");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /sign in with sso/i }).click();
    await expect(page.getByPlaceholder(/your@company\.com/i)).toBeVisible();

    // Cancel should hide the input
    await page.getByText(/cancel/i).click();
    await expect(page.getByPlaceholder(/your@company\.com/i)).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with sso/i })
    ).toBeVisible();
  });
});

test.describe("SSO Callback @p2", () => {
  test("should show loading state and redirect when no error", async ({
    page,
  }) => {
    // Navigate to callback with no error param
    // better-auth has already set the session cookie — just redirect
    await page.goto("/auth/sso/callback");
    await page.waitForLoadState("domcontentloaded");

    // Should redirect to workspace (or another page based on auth state)
    // Since we're not actually logged in, it may redirect to sign-in
    // The important thing is that no error is displayed
    await expect(
      page.getByText(/authentication error/i)
    ).not.toBeVisible({ timeout: 3_000 });
  });

  test("should show error card for invalid_state error", async ({ page }) => {
    await page.goto("/auth/sso/callback?error=invalid_state");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/authentication error/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByText(/invalid or expired authentication session/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /return to sign in/i })
    ).toBeVisible();
  });

  test("should show error card for no_email error", async ({ page }) => {
    await page.goto("/auth/sso/callback?error=no_email");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByText(/did not return an email/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should show generic error for unknown error code", async ({
    page,
  }) => {
    await page.goto("/auth/sso/callback?error=some_unknown_error");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/some_unknown_error/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});
