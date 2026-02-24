import { type Locator, type Page, expect } from "@playwright/test";

export class SignInPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signUpLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorAlert: Locator;
  readonly googleLoginButton: Locator;
  readonly ssoLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder("Enter your email");
    this.passwordInput = page.getByPlaceholder("Enter your password");
    this.signInButton = page.getByRole("button", { name: /sign in/i });
    this.signUpLink = page.getByRole("link", { name: /create a new account/i });
    this.forgotPasswordLink = page.getByRole("link", {
      name: /forgot your password/i,
    });
    this.errorAlert = page.locator('[data-variant="destructive"]');
    this.googleLoginButton = page.getByRole("button", { name: /google/i });
    this.ssoLoginButton = page.getByRole("button", { name: /sso/i });
  }

  async goto() {
    await this.page.goto("/auth/sign-in");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async expectErrorMessage(text: string | RegExp) {
    await expect(this.errorAlert).toContainText(text);
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL("/", { timeout: 15_000 });
  }

  async expectRedirectToWorkspaceSetup() {
    await this.page.waitForURL("**/workspace", { timeout: 15_000 });
  }
}
