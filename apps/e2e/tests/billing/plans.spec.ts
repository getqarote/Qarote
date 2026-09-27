import { expect, test } from "@playwright/test";

test.describe("Plans Page @p2", () => {
  test("should display the single cloud plan @cloud", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: /subscribe/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: /qarote cloud/i })
    ).toBeVisible();
  });

  test("should not offer the retired tiers @cloud", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("heading", { name: /qarote cloud/i })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/developer/i)).toHaveCount(0);
    await expect(page.getByText(/enterprise/i)).toHaveCount(0);
  });

  test("should show billing toggle (monthly/yearly) @cloud", async ({
    page,
  }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/monthly/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/yearly/i)).toBeVisible();
  });

  test("should show plan pricing details @cloud", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    // The card leads with the yearly rate as a per-month figure.
    await expect(page.getByText(/\$99/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
