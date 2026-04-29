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
    // Scoped to the data-testid container so the selector stays stable even
    // if other checkboxes are added to the form in future.
    this.acceptTermsCheckbox = page
      .getByTestId("accept-terms")
      .getByRole("checkbox");
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
    // Terms checkbox is required — always check it if present.
    // Radix UI renders as button[role="checkbox"] so we use click(), not check().
    // waitFor ensures the su-in CSS animation has completed before we interact.
    await this.acceptTermsCheckbox.waitFor({ state: "visible" });
    await this.acceptTermsCheckbox.click();
  }

  async submit() {
    await this.createAccountButton.click();
  }

  async expectSuccess() {
    // After registration the app either:
    //   a) redirects to onboarding/dashboard (self-hosted, email disabled), or
    //   b) stays on the sign-up page and shows a success alert
    //      ("Your account is ready" or "We've sent a verification email").
    const allowedPaths = ["/", "/workspace", "/dashboard", "/onboarding"];
    await expect(async () => {
      const { pathname } = new URL(this.page.url());
      const hasRedirected = allowedPaths.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
      );
      const hasSuccessMessage = await this.page
        .getByText(
          /account ready|verification email|account created|welcome/i
        )
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasRedirected || hasSuccessMessage).toBeTruthy();
    }).toPass({ timeout: 15_000 });
  }

  async expectSuccessMessage() {
    // Two valid outcomes after registration:
    //   a) Success alert is visible ("account ready" / "verification email")
    //   b) App auto-redirected away from sign-up (selfhosted auto-login after auto-verify)
    // The real assertions (DB check, sign-in) follow in the test — the UI message
    // is best-effort.
    await expect(async () => {
      const { pathname } = new URL(this.page.url());
      if (pathname !== "/auth/sign-up") return; // navigated away — accept
      await expect(
        this.page
          .getByText(/account ready|verification email|account created/i)
          .first()
      ).toBeVisible();
    }).toPass({ timeout: 15_000 });
  }

  async expectError(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({
      timeout: 10_000,
    });
  }
}
