import { test, expect } from "../../fixtures/test-base.js";
import { SignInPage } from "../../page-objects/auth/sign-in.page.js";
import { SignUpPage } from "../../page-objects/auth/sign-up.page.js";
import { uniqueEmail } from "../../helpers/factories/user.factory.js";

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

  test("should auto-verify and allow immediate sign-in (community) @community", async ({
    page,
    db,
  }) => {
    test.skip(
      process.env.DEPLOYMENT_MODE === "cloud",
      "Community mode only — email disabled, auto-verifies"
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
});
