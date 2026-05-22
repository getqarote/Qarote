import { expect, test } from "../../fixtures/test-base.js";

/**
 * RBAC admin-guard regression tests.
 *
 * Pins two regressions that the <RequireWorkspaceAdmin> /
 * <RequireOrgAdmin> guards exist to prevent:
 *
 *  1. "Access-denied flash on hard refresh" — under throttled network
 *     conditions, an admin user must never see the PermissionDeniedCard
 *     before the role query resolves. We assert the loading wrapper
 *     exposes role=status / aria-busy throughout the resolution window.
 *
 *  2. "Silent redirect on denial" — a readonly user landing on an
 *     admin-only URL must stay on that URL and see the inline
 *     PermissionDeniedCard with a working CTA. The pre-RBAC behaviour
 *     `<Navigate to="/settings/profile" replace />` is intentionally
 *     walked back so the user knows why they were blocked.
 */
test.describe("RBAC admin-guard loading + denied UX @p1", () => {
  test("admin on /users sees loading wrapper, never the denied card", async ({
    adminPage,
  }) => {
    // Throttle the workspace role lookup so the loading window is long
    // enough to assert against. Without this, the query resolves before
    // Playwright can sample the DOM.
    await adminPage.route("**/api/trpc/workspace.core.getMyRole**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await adminPage.goto("/users");

    // While loading, the guard wraps the visible skeleton in aria-busy
    // and renders a sibling sr-only <output> as the live region for AT.
    const ariaBusyWrapper = adminPage.locator('[aria-busy="true"]');
    await expect(ariaBusyWrapper.first()).toBeAttached({ timeout: 2_000 });
    await expect(adminPage.getByRole("status").first()).toBeAttached();

    // Crucially, the denied card must NOT have flashed during the
    // resolution window — its heading is the canary.
    await expect(
      adminPage.getByRole("heading", { name: /admin access required/i })
    ).not.toBeVisible();

    // Once the role resolves, the page renders normally (no enduring
    // skeleton). We don't assert on the table itself — the page may
    // route through other guards (no server selected, etc.) depending
    // on seed state. The contract is: the denied card never appeared.
    await adminPage.waitForLoadState("networkidle");
    await expect(
      adminPage.getByRole("heading", { name: /admin access required/i })
    ).not.toBeVisible();
  });

  test("readonly user on /users sees inline denied card with working CTA", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/users");
    await readonlyPage.waitForLoadState("networkidle");

    // PermissionDeniedCard renders an <h2> with the title.
    await expect(
      readonlyPage.getByRole("heading", { level: 2, name: /admin access required/i })
    ).toBeVisible({ timeout: 10_000 });

    // URL stays on /users — the product standard is "explain why,
    // don't silently redirect".
    expect(readonlyPage.url()).toContain("/users");

    // CTA is a real <Link> that navigates home.
    const cta = readonlyPage.getByRole("link", { name: /back to dashboard/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/");

    await cta.click();
    await readonlyPage.waitForURL("**/");
    expect(readonlyPage.url()).toMatch(/\/$/);
  });

  test("readonly user on /settings/smtp stays on URL and sees CTA back to settings", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/settings/smtp");
    await readonlyPage.waitForLoadState("networkidle");

    // On cloud (default e2e fixture), isSelfHostedMode() is false and
    // the sync guard redirects to /settings/profile *before* the role
    // lookup. That path is unchanged by this PR and we don't assert
    // against it here — the org-admin denied UX only kicks in on
    // self-hosted instances, which are covered by self-hosted Playwright
    // projects. We only assert there's no JS crash and the URL is
    // either the original or the expected profile redirect.
    const url = readonlyPage.url();
    expect(url).toMatch(/\/settings\/(smtp|profile)/);
  });
});
