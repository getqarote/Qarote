import { test, expect } from "../../fixtures/test-base.js";
import { SignInPage } from "../../page-objects/auth/sign-in.page.js";

test.describe("User Login @p0", () => {
  test("should login with valid credentials and redirect to dashboard", async ({
    page,
  }) => {
    const signInPage = new SignInPage(page);

    await signInPage.goto();
    await signInPage.login("admin@e2e-test.local", "TestPassword123!");
    await signInPage.expectRedirectToDashboard();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    const signInPage = new SignInPage(page);

    await signInPage.goto();
    await signInPage.login("admin@e2e-test.local", "WrongPassword!");
    await signInPage.expectErrorMessage(/invalid email or password/i);
  });

  test("should show error for non-existent user", async ({ page }) => {
    const signInPage = new SignInPage(page);

    await signInPage.goto();
    await signInPage.login("nonexistent@test.local", "AnyPassword123!");
    await signInPage.expectErrorMessage(/invalid email or password/i);
  });

  test("should redirect unauthenticated users from protected routes", async ({
    page,
  }) => {
    await page.goto("/queues");
    await page.waitForURL("**/auth/sign-in", { timeout: 10_000 });
  });

  test("should redirect authenticated users away from sign-in", async ({
    adminPage,
  }) => {
    await adminPage.goto("/auth/sign-in");
    // Authenticated user should be redirected to dashboard
    await adminPage.waitForURL("/", { timeout: 10_000 });
  });

  test("should navigate to sign-up page", async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.signUpLink.click();
    await page.waitForURL("**/auth/sign-up");
  });

  test("should navigate to forgot password page", async ({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();
    await signInPage.forgotPasswordLink.click();
    await page.waitForURL("**/forgot-password");
  });
});
