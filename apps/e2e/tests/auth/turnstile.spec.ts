/**
 * Turnstile CAPTCHA e2e tests
 *
 * These tests verify two things:
 *
 * 1. When TURNSTILE_SECRET_KEY is NOT set on the server (the default e2e
 *    environment), the middleware is a no-op and sign-in/sign-up work normally.
 *
 * 2. When TURNSTILE_SECRET_KEY IS set, a missing X-Turnstile-Token header
 *    causes the API to reject sign-in requests with 400.
 *
 * UI integration tests for the widget itself (button gating, widget render)
 * require a build with VITE_TURNSTILE_SITE_KEY set and are covered by manual
 * QA using Cloudflare's always-pass test site key (1x00000000000000000000AA).
 */
import { expect, test } from "../../fixtures/test-base.js";

const apiUrl = process.env.API_URL ?? "http://localhost:3001";

test.describe("Turnstile middleware", () => {
  test("sign-in is unaffected when TURNSTILE_SECRET_KEY is not set", async ({
    page,
  }) => {
    test.skip(
      Boolean(process.env.VITE_TURNSTILE_SITE_KEY),
      "VITE_TURNSTILE_SITE_KEY is set — button will be gated by the widget"
    );
    // The middleware skips verification when the secret is absent.
    // We verify this by checking that the sign-in page renders the button
    // in an enabled state (i.e., no permanent CAPTCHA gate).
    await page.goto("/auth/sign-in");
    const submitButton = page.getByRole("button", {
      name: "Sign in",
      exact: true,
    });
    await expect(submitButton).toBeVisible();
    // Button must not be unconditionally disabled when Turnstile is off.
    await expect(submitButton).not.toBeDisabled();
  });

  test("sign-up button is accessible when TURNSTILE_SECRET_KEY is not set", async ({
    page,
  }) => {
    test.skip(
      Boolean(process.env.VITE_TURNSTILE_SITE_KEY),
      "VITE_TURNSTILE_SITE_KEY is set — button will be gated by the widget"
    );
    await page.goto("/auth/sign-up");
    const submitButton = page.getByRole("button", { name: /create account/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).not.toBeDisabled();
  });

  test("API rejects sign-in missing X-Turnstile-Token when secret is configured", async ({
    request,
  }) => {
    test.skip(
      !process.env.TURNSTILE_SECRET_KEY,
      "TURNSTILE_SECRET_KEY not set — middleware is disabled in this environment"
    );

    const res = await request.post(`${apiUrl}/api/auth/sign-in/email`, {
      data: { email: "any@test.local", password: "Password123!" },
      // Deliberately omit X-Turnstile-Token
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/captcha required/i);
  });

  test("API rejects sign-in with invalid Turnstile token when secret is configured", async ({
    request,
  }) => {
    test.skip(
      !process.env.TURNSTILE_SECRET_KEY,
      "TURNSTILE_SECRET_KEY not set — middleware is disabled in this environment"
    );

    const res = await request.post(`${apiUrl}/api/auth/sign-in/email`, {
      data: { email: "any@test.local", password: "Password123!" },
      headers: { "X-Turnstile-Token": "invalid-token" },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/captcha verification failed/i);
  });
});
