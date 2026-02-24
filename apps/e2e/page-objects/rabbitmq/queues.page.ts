import { type Locator, type Page, expect } from "@playwright/test";

export class QueuesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly queueTable: Locator;
  readonly filterInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /queues/i });
    this.queueTable = page.locator("table");
    this.filterInput = page.getByPlaceholder(/filter|search/i);
  }

  async goto() {
    await this.page.goto("/queues");
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 15_000 });
  }

  async expectQueuesVisible() {
    await expect(this.queueTable).toBeVisible({ timeout: 15_000 });
  }

  async filterByName(name: string) {
    await this.filterInput.fill(name);
  }

  async clickQueue(queueName: string) {
    await this.page.getByRole("link", { name: queueName }).click();
  }

  async getQueueRowCount(): Promise<number> {
    return this.queueTable.locator("tbody tr").count();
  }
}
