import { test, expect } from "../../fixtures/test-base.js";
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
});
