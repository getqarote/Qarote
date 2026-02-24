import { type Locator, type Page, expect } from "@playwright/test";

export class SignUpPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly acceptTermsCheckbox: Locator;
  readonly createAccountButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByPlaceholder("John");
    this.lastNameInput = page.getByPlaceholder("Doe");
    this.emailInput = page.getByPlaceholder("john@example.com");
    this.passwordInput = page.getByPlaceholder("Create a password");
    this.confirmPasswordInput = page.getByPlaceholder("Confirm your password");
    this.acceptTermsCheckbox = page.getByRole("checkbox");
    this.createAccountButton = page.getByRole("button", {
      name: /create account/i,
    });
    this.successAlert = page.locator(".border-green-200");
    this.errorAlert = page.locator('[data-variant="destructive"]');
    this.signInLink = page.getByRole("link", {
      name: /sign in to your existing account/i,
    });
  }

  async goto() {
    await this.page.goto("/auth/sign-up");
  }

  async fillForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
    await this.acceptTermsCheckbox.check();
  }

  async submit() {
    await this.createAccountButton.click();
  }

  async expectSuccess() {
    await expect(this.successAlert).toBeVisible({ timeout: 10_000 });
    await expect(this.successAlert).toContainText(
      "Account created successfully"
    );
  }

  async expectError(text: string | RegExp) {
    await expect(this.errorAlert).toBeVisible({ timeout: 5_000 });
    await expect(this.errorAlert).toContainText(text);
  }
}
