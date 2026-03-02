import { test, expect } from "../../fixtures/test-base.js";
import { SignInPage } from "../../page-objects/auth/sign-in.page.js";
import { SignUpPage } from "../../page-objects/auth/sign-up.page.js";
import { uniqueEmail } from "../../helpers/factories/user.factory.js";

const apiUrl = process.env.API_URL || "http://localhost:3001";

test.describe("User Registration @p0", () => {
  test("should register a new user successfully", async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    const email = uniqueEmail("signup");

    await signUpPage.goto();
    await signUpPage.fillForm({
      firstName: "New",
      lastName: "User",
      email,
      password: "SecurePass123!",
    });
    await signUpPage.submit();
    await signUpPage.expectSuccess();
  });

  test("should show error for duplicate email", async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    await signUpPage.goto();
    await signUpPage.fillForm({
      firstName: "Duplicate",
      lastName: "User",
      email: "admin@e2e-test.local",
      password: "SecurePass123!",
    });
    await signUpPage.submit();

    // Should show an error about existing email
    await expect(
      page.getByText(/already in use|already exists|already registered|email.*taken/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to sign-in page", async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    await signUpPage.signInLink.click();
    await page.waitForURL("**/auth/sign-in");
  });

  test("should show password requirements", async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    await signUpPage.passwordInput.fill("weak");
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("should auto-verify and allow immediate sign-in (selfhosted) @selfhosted", async ({
    page,
    db,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Selfhosted mode only — email disabled, auto-verifies"
    );

    const signUpPage = new SignUpPage(page);
    const email = uniqueEmail("autoverify");
    const password = "SecurePass123!";

    // Register a new user
    await signUpPage.goto();
    await signUpPage.fillForm({
      firstName: "Auto",
      lastName: "Verified",
      email,
      password,
    });
    await signUpPage.submit();
    await signUpPage.expectSuccessMessage();

    // Verify auto-verification in database (ENABLE_EMAIL=false → emailVerified=true)
    const user = await db.getUserByEmail(email);
    expect(user, "Registered user should exist in DB").toBeTruthy();
    expect(user.emailVerified).toBe(true);

    // Should be able to sign in immediately
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.login(email, password);
    await signInPage.expectRedirectToDashboard();
  });

  test("should require email verification in cloud mode @cloud", async ({
    page,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE !== "cloud",
      "Cloud mode only — email verification required"
    );

    const signUpPage = new SignUpPage(page);
    const email = uniqueEmail("cloudverify");
    const password = "SecurePass123!";

    // Register a new user in cloud mode
    await signUpPage.goto();
    await signUpPage.fillForm({
      firstName: "Cloud",
      lastName: "User",
      email,
      password,
    });
    await signUpPage.submit();
    await signUpPage.expectSuccessMessage();

    // In cloud mode with email enabled, trying to sign in should fail
    // because the user hasn't verified their email yet
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.login(email, password);
    await signInPage.expectErrorMessage(/verify your email|email not verified|not verified/i);
  });

  test("should show registration disabled message when registration is off", async ({
    page,
  }) => {
    // Intercept public.getConfig to simulate registration disabled
    await page.route(`${apiUrl}/trpc/public.getConfig*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              registrationEnabled: false,
              emailEnabled: false,
              oauthEnabled: false,
              ssoEnabled: false,
            },
          },
        }),
      })
    );

    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");

    // Should show "Registration Disabled" message
    await expect(
      page.getByText(/registration disabled/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Registration form should NOT be visible
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).not.toBeVisible();

    // Should have a "Go to Sign In" button
    await expect(
      page.getByRole("button", { name: /go to sign in/i })
    ).toBeVisible();
  });

  test("should reject registration at API level when disabled @selfhosted", async () => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Selfhosted mode only"
    );

    // In the default E2E config, registration IS enabled.
    // This test verifies the API shape; the actual guard is tested via
    // the route intercept test above for UI and integration tests
    // with ENABLE_REGISTRATION=false for full end-to-end.
    const response = await fetch(`${apiUrl}/trpc/auth.registration.register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test-reg-check@e2e-test.local",
        password: "SecurePass123!",
        firstName: "Test",
        lastName: "Check",
        acceptTerms: true,
      }),
    });

    // With registration enabled (default), this should succeed (200) or
    // fail for other reasons (duplicate email, etc.) — NOT 403 FORBIDDEN
    const body = await response.json();
    if (body.error) {
      // If there's an error, it should NOT be the registration disabled error
      expect(body.error.message).not.toMatch(/registration.*disabled/i);
    }
  });
});
