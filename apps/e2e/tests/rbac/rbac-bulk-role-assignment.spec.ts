import { expect, test } from "../../fixtures/test-base.js";

/**
 * Bulk role assignment UX surfaces (PR-4.1).
 *
 * Seed roles (global-setup):
 *   adminPage     → WorkspaceRole.ADMIN
 *   readonlyPage  → WorkspaceRole.READONLY
 *
 * We assert the surfaces are wired correctly, not the backend semantics
 * (those are covered by unit tests):
 *   - bulk toolbar appears when a row is checked
 *   - role Select shows the "Standard roles" group with built-in
 *     options (Custom group is asserted absent on the seed fixture,
 *     which doesn't create any custom roles)
 *   - readonly user sees neither checkboxes nor toolbar
 */

test.describe("RBAC — Team page bulk toolbar @p2", () => {
  test("admin sees row checkboxes and toolbar appears on selection", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/team");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for the table to populate.
    await expect(
      adminPage.locator("[data-testid='member-role-badge']").first()
    ).toBeVisible({ timeout: 10_000 });

    // Find a row-level "Select <name>" checkbox and click it.
    const rowCheckbox = adminPage
      .getByRole("checkbox", { name: /^select /i })
      .first();
    await expect(rowCheckbox).toBeVisible({ timeout: 10_000 });
    await rowCheckbox.click();

    // The toolbar is a region announced via aria-label "X selected".
    await expect(
      adminPage.getByRole("region", { name: /selected/i })
    ).toBeVisible({ timeout: 5_000 });

    // Apply is initially disabled until a role is picked.
    const applyButton = adminPage.getByRole("button", {
      name: /assign to \d+/i,
    });
    await expect(applyButton).toBeDisabled();

    // "Clear selection" tears the toolbar down again.
    await adminPage
      .getByRole("button", { name: /clear selection/i })
      .click();
    await expect(
      adminPage.getByRole("region", { name: /selected/i })
    ).not.toBeVisible();
  });

  test("role Select renders the Standard roles group with built-in options", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/team");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.locator("[data-testid='member-role-badge']").first()
    ).toBeVisible({ timeout: 10_000 });

    // Trigger the toolbar by selecting any actionable row.
    await adminPage
      .getByRole("checkbox", { name: /^select /i })
      .first()
      .click();

    // Open the bulk role Select. The combobox lives inside the toolbar
    // region.
    const trigger = adminPage
      .getByRole("region", { name: /selected/i })
      .getByRole("combobox");
    await trigger.click();

    // SelectGroup with SelectLabel "Standard roles" must appear and
    // hold at least one known built-in option (Admin in EN).
    const listbox = adminPage.getByRole("listbox");
    await expect(listbox.getByText(/standard roles/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      listbox.getByRole("option", { name: /^admin$/i })
    ).toBeVisible();

    // The seed fixture creates no custom roles, so the Custom group
    // must be absent rather than empty.
    await expect(listbox.getByText(/custom roles/i)).toHaveCount(0);
  });

  test("readonly user sees no row checkboxes or bulk toolbar", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/settings/team");
    await readonlyPage.waitForLoadState("domcontentloaded");

    // Page itself is gated by WorkspaceForbidden for READONLY.
    await expect(readonlyPage.getByRole("alert")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      readonlyPage.getByRole("checkbox", { name: /^select /i })
    ).toHaveCount(0);

    // Even on the off-chance the gate ever loosened, the bulk toolbar
    // region must never render for READONLY — it has no actionable
    // controls in this role.
    await expect(
      readonlyPage.getByRole("region", { name: /selected/i })
    ).toHaveCount(0);
  });
});
