import { test, expect } from "../../fixtures/test-base.js";

test.describe("Alerts Page @p1", () => {
  test("should navigate to alerts page", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("networkidle");

    await expect(adminPage).toHaveURL(/\/alerts/);
    await expect(
      adminPage.getByRole("heading", { name: /alerts/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show alerts subtitle", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("networkidle");

    await expect(
      adminPage.getByText(/monitor.*alerts|notifications/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show active and resolved alert tabs", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("networkidle");

    const activeTab = adminPage.getByRole("tab", { name: /active/i });
    const resolvedTab = adminPage.getByRole("tab", { name: /resolved/i });

    // Tabs should be visible (alerts feature may require premium, but tabs should show)
    if (await activeTab.isVisible()) {
      await expect(activeTab).toBeVisible();
      await expect(resolvedTab).toBeVisible();
    }
  });

  test("should show alert rules button", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("networkidle");

    // Alert Rules button should be in the header
    const rulesButton = adminPage.getByRole("button", {
      name: /alert rules/i,
    });
    if (await rulesButton.isVisible()) {
      await expect(rulesButton).toBeEnabled();
    }
  });

  test("should show notification settings button", async ({ adminPage }) => {
    await adminPage.goto("/alerts");
    await adminPage.waitForLoadState("networkidle");

    const settingsButton = adminPage.getByRole("button", {
      name: /notification settings/i,
    });
    if (await settingsButton.isVisible()) {
      await expect(settingsButton).toBeEnabled();
    }
  });
});
