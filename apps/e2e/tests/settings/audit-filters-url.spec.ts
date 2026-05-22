import { expect, test } from "../../fixtures/test-base.js";

/**
 * Audit settings — URL-backed filters.
 *
 * Filters in AuditSection are persisted in the URL via nuqs so a compliance
 * reviewer can share a filtered view ("look at the audit slice between X
 * and Y for user Z") and survive a refresh. These tests pin that contract
 * — they intentionally don't assert on the table contents, only on the
 * URL <-> control-state binding.
 */
test.describe("Audit settings — URL-backed filters @p1", () => {
  test("category filter is reflected in the URL and survives reload", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/audit");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for the filter bar to be ready
    const categorySelect = adminPage.getByRole("combobox", {
      name: /category/i,
    });
    await expect(categorySelect).toBeVisible({ timeout: 15_000 });

    // Default tab is "activity" — clearOnDefault should keep it out of the URL.
    await expect(adminPage).not.toHaveURL(/tab=activity/);

    // Pick a non-default category
    await categorySelect.click();
    await adminPage.getByRole("option", { name: /^Auth$/i }).click();

    // URL should encode the selection (clearOnDefault removes "all" but keeps "auth")
    await expect(adminPage).toHaveURL(/[?&]category=auth/);

    // Reload — filter state must rehydrate from the URL
    await adminPage.reload();
    await adminPage.waitForLoadState("domcontentloaded");
    await expect(categorySelect).toHaveText(/Auth/i, { timeout: 10_000 });
    await expect(adminPage).toHaveURL(/[?&]category=auth/);
  });

  test("actor search is intentionally NOT in the URL (PII)", async ({
    adminPage,
  }) => {
    // Actor is an employee email — keeping it out of the URL keeps it
    // out of browser history, API access logs (via Referer) and any
    // shared share-links. Typing must not echo to the URL.
    await adminPage.goto("/settings/audit");
    await adminPage.waitForLoadState("domcontentloaded");

    const actorInput = adminPage.getByPlaceholder(/actor/i);
    await expect(actorInput).toBeVisible({ timeout: 15_000 });

    await actorInput.fill("alice@example.com");
    await expect(actorInput).toHaveValue("alice@example.com");

    // No actor= param should appear regardless of keystrokes.
    await expect(adminPage).not.toHaveURL(/actor=/);

    // Reload drops the local-only actor — expected trade-off for PII safety.
    await adminPage.reload();
    await adminPage.waitForLoadState("domcontentloaded");
    await expect(actorInput).toHaveValue("", { timeout: 10_000 });
  });

  test("Clear filters wipes URL params and resets actor", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/audit?category=auth");
    await adminPage.waitForLoadState("domcontentloaded");

    const actorInput = adminPage.getByPlaceholder(/actor/i);
    await expect(actorInput).toBeVisible({ timeout: 15_000 });
    await actorInput.fill("bob@example.com");

    const clearBtn = adminPage.getByRole("button", { name: /clear filters/i });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(adminPage).not.toHaveURL(/category=auth/);
    await expect(actorInput).toHaveValue("");
  });

  test("Tab selection is reflected in the URL and survives reload", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/audit");
    await adminPage.waitForLoadState("domcontentloaded");

    const denialsTab = adminPage.getByRole("tab", { name: /denials/i });
    await expect(denialsTab).toBeVisible({ timeout: 15_000 });
    await denialsTab.click();

    await expect(adminPage).toHaveURL(/[?&]tab=denials/);

    await adminPage.reload();
    await adminPage.waitForLoadState("domcontentloaded");
    await expect(denialsTab).toHaveAttribute("data-state", "active", {
      timeout: 10_000,
    });
  });
});
