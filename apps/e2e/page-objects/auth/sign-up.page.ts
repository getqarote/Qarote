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
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByRole("textbox", { name: /first name/i });
    this.lastNameInput = page.getByRole("textbox", { name: /last name/i });
    this.emailInput = page.getByRole("textbox", { name: /email/i });
    this.passwordInput = page.getByLabel(/^password$/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.acceptTermsCheckbox = page.getByRole("checkbox", { name: /terms|privacy|agree/i });
    this.createAccountButton = page.getByRole("button", {
      name: /create account/i,
    });
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
    // Terms checkbox may or may not exist depending on config
    if (await this.acceptTermsCheckbox.isVisible()) {
      await this.acceptTermsCheckbox.check();
    }
  }

  async submit() {
    await this.createAccountButton.click();
  }

  async expectSuccess() {
    // In community mode (email disabled), user is auto-verified and redirected.
    // Only consider specific post-signup paths as valid redirects.
    const allowedPaths = ["/", "/workspace", "/dashboard", "/onboarding"];
    await expect(async () => {
      const { pathname } = new URL(this.page.url());
      const hasRedirected = allowedPaths.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      );
      const hasSuccessMessage = await this.page
        .getByText(/account created|welcome|dashboard/i)
        .isVisible()
        .catch(() => false);
      expect(hasRedirected || hasSuccessMessage).toBeTruthy();
    }).toPass({ timeout: 15_000 });
  }

  async expectError(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({
      timeout: 10_000,
    });
  }
}
