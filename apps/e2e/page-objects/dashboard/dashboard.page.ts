import { type Locator, type Page, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addServerButton: Locator;
  readonly serverSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading").first();
    this.addServerButton = page.getByRole("button", { name: /add.*server/i });
    this.serverSelector = page.locator("[data-testid='server-selector']");
  }

  async goto() {
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL("/");
  }

  async expectNoServerState() {
    // When no server is connected, the user should see a prompt to add one
    await expect(
      this.page.getByText(/add.*server|no.*server|connect.*server/i)
    ).toBeVisible({ timeout: 10_000 });
  }
}
