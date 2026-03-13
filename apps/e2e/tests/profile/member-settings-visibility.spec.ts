import { test, expect } from "../../fixtures/test-base.js";

test.describe("Member Settings Visibility @p2", () => {
  // --- PersonalInfoTab: Security Settings ---

  test("admin with password account sees Security Settings card", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("heading", { name: /security settings/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("non-admin user does not see Security Settings card", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/settings/profile");
    await readonlyPage.waitForLoadState("domcontentloaded");

    // Security Settings heading should not be visible for non-admin users
    await expect(
      readonlyPage.getByRole("heading", { name: /security settings/i })
    ).not.toBeVisible({ timeout: 10_000 });

    // The old "Account Security" card with Google-managed message should also be gone
    await expect(
      readonlyPage.getByText(/your account is managed by google/i)
    ).not.toBeVisible({ timeout: 10_000 });
  });

  // --- PlansSummaryTab: Quick Actions ---

  test("admin sees Billing & Usage and Compare Plans on plans page", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/plans");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/billing & usage/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      adminPage.getByText(/compare plans/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("non-admin does not see Billing & Usage or Compare Plans", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/settings/plans");
    await readonlyPage.waitForLoadState("domcontentloaded");

    // Quick action links should not be visible for non-admin users
    await expect(
      readonlyPage.getByText(/billing & usage/i)
    ).not.toBeVisible({ timeout: 10_000 });

    await expect(
      readonlyPage.getByText(/compare plans/i)
    ).not.toBeVisible({ timeout: 10_000 });

    // Plan info card itself should still be visible for members
    await expect(
      readonlyPage.getByText(/free|developer|enterprise|plan/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // --- WorkspaceInfoTab: Admin-only alert removal ---

  test("non-admin does not see admin-only alert on workspace page", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/settings/workspace");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await expect(
      readonlyPage.getByText(/only admin users can edit workspace information/i)
    ).not.toBeVisible({ timeout: 10_000 });
  });
});
