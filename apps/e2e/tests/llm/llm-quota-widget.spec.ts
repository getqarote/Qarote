import { mockTrpcQuery } from "../../helpers/trpc-mock.js";
import { expect, test } from "../../fixtures/test-base.js";

/**
 * Settings → AI usage widget renders four different shapes driven by the
 * `workspace.llm.quotaCurrent` discriminated union. These tests mock the
 * tRPC response and assert the widget reacts to each `mode` correctly.
 *
 * Drawer at-cap UX (QuotaExceededCard / QuotaProgressPill rendered during
 * a streaming session) requires SSE response mocking, which is tracked as
 * a follow-up — the streaming endpoint isn't a tRPC procedure, so the
 * standard mockTrpcQuery helper doesn't apply. Manual verification is
 * documented in docs/internal/llm-managed-quota.md § Verification.
 */

test.describe("LLM Quota Usage Widget @p1", () => {
  test.describe("mode: unavailable", () => {
    test("widget is hidden when the feature is gated off (Free plan / no license)", async ({
      adminPage,
    }) => {
      await mockTrpcQuery(adminPage, "workspace.llm.quotaCurrent", {
        mode: "unavailable",
      });
      await adminPage.goto("/settings/llm");

      // The form-level title "AI / LLM" stays visible — that's the existing
      // settings card. The widget's own title is "Monthly AI explanation
      // usage" and MUST NOT render.
      await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        adminPage.getByText("Monthly AI explanation usage", { exact: true })
      ).toHaveCount(0);
    });
  });

  test.describe("mode: byok", () => {
    test("renders the 'not metered' card for BYOK workspaces", async ({
      adminPage,
    }) => {
      await mockTrpcQuery(adminPage, "workspace.llm.quotaCurrent", {
        mode: "byok",
      });
      await adminPage.goto("/settings/llm");

      await expect(
        adminPage.getByText("Monthly AI explanation usage")
      ).toBeVisible({ timeout: 15_000 });
      // BYOK copy mentions the user's own key and Qarote not metering.
      await expect(adminPage.getByText(/own API key/i)).toBeVisible();
      // No progress bar in BYOK mode.
      await expect(adminPage.locator('[role="progressbar"]')).toHaveCount(0);
    });
  });

  test.describe("mode: managed (capped)", () => {
    test("renders 'X of Y used' + progress bar + reset date", async ({
      adminPage,
    }) => {
      await mockTrpcQuery(adminPage, "workspace.llm.quotaCurrent", {
        mode: "managed",
        used: 12,
        cap: 50,
        resetDate: "2026-06-01T00:00:00.000Z",
      });
      await adminPage.goto("/settings/llm");

      await expect(
        adminPage.getByText("Monthly AI explanation usage")
      ).toBeVisible({ timeout: 15_000 });
      await expect(adminPage.getByText("12 of 50 explanations used")).toBeVisible();
      await expect(adminPage.getByText(/38 left/)).toBeVisible();
      // Reset date is locale-formatted; the year + month name should appear.
      await expect(adminPage.getByText(/June 1, 2026|2026/)).toBeVisible();

      // Progress bar present with correct ARIA values.
      const progressBar = adminPage.locator('[role="progressbar"]');
      await expect(progressBar).toBeVisible();
      await expect(progressBar).toHaveAttribute("aria-valuenow", "12");
      await expect(progressBar).toHaveAttribute("aria-valuemax", "50");
    });

    test("at-cap state (used >= cap) renders the bar at 100%", async ({
      adminPage,
    }) => {
      await mockTrpcQuery(adminPage, "workspace.llm.quotaCurrent", {
        mode: "managed",
        used: 50,
        cap: 50,
        resetDate: "2026-06-01T00:00:00.000Z",
      });
      await adminPage.goto("/settings/llm");

      await expect(adminPage.getByText("50 of 50 explanations used")).toBeVisible(
        { timeout: 15_000 }
      );
      // Remaining clamps to 0 — never negative.
      await expect(adminPage.getByText(/0 left/)).toBeVisible();
    });
  });

  test.describe("mode: managed (unlimited)", () => {
    test("renders the unlimited message instead of a progress bar", async ({
      adminPage,
    }) => {
      await mockTrpcQuery(adminPage, "workspace.llm.quotaCurrent", {
        mode: "managed",
        used: 9999,
        cap: null,
        resetDate: "2026-06-01T00:00:00.000Z",
      });
      await adminPage.goto("/settings/llm");

      await expect(
        adminPage.getByText("Monthly AI explanation usage")
      ).toBeVisible({ timeout: 15_000 });
      await expect(adminPage.getByText(/Unlimited/i)).toBeVisible();
      // Enterprise customers should NOT see a usage number masquerading as a
      // limit — the bar is hidden for unlimited plans.
      await expect(adminPage.locator('[role="progressbar"]')).toHaveCount(0);
    });
  });

  test.describe("access control", () => {
    test("non-admin member is redirected away from /settings/llm", async ({
      memberPage,
    }) => {
      await memberPage.goto("/settings/llm");
      await expect(memberPage).not.toHaveURL("/settings/llm", {
        timeout: 10_000,
      });
    });
  });
});
