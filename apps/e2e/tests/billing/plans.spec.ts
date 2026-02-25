import { expect, test } from "@playwright/test";

test.describe("Plans Page @p2", () => {
  test("should display plans page with pricing cards @cloud", async ({
    page,
  }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("heading", { name: /choose your plan/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show three plan tiers @cloud", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    // Should show Free, Developer, and Enterprise plans
    await expect(page.getByText(/free/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/developer/i).first()).toBeVisible();
    await expect(page.getByText(/enterprise/i).first()).toBeVisible();
  });

  test("should show billing toggle (monthly/yearly) @cloud", async ({
    page,
  }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/monthly/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/yearly/i)).toBeVisible();
  });

  test("should show feature highlights @cloud", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(/live monitoring/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/smart analytics/i)).toBeVisible();
  });

  test("should show plan pricing details @cloud", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForLoadState("domcontentloaded");

    // Plans should display dollar-amount pricing
    await expect(page.getByText(/\$\d+/).first()).toBeVisible({ timeout: 15_000 });
  });
});
