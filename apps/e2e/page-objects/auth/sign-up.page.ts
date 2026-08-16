import { type Locator, type Page, expect } from "@playwright/test";

export class SignUpPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly createAccountButton: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole("textbox", { name: /email/i });
    this.passwordInput = page.getByLabel(/^password$/i);
    this.createAccountButton = page.getByRole("button", {
      name: /create account/i,
    });
    this.signInLink = page.getByRole("link", { name: /sign in/i });
  }

  async goto() {
    await this.page.goto("/auth/sign-up");
  }

  // The lightweight sign-up collects only email + password; name and terms
  // acceptance moved off the form (onboarding / passive legal notice).
  async fillForm(data: { email: string; password: string }) {
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
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
        .getByText(/account ready|verification email|account created|welcome/i)
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
