import { expect, test } from "../../fixtures/test-base.js";

/**
 * Agent Access settings — mint, copy-once gate, list, revoke. The
 * critical invariants the PRD calls out:
 *
 * - the freshly-minted secret is shown EXACTLY ONCE — after the reveal
 *   dialog closes, the value must not be recoverable from the DOM,
 * - the Done button cannot be clicked until the operator ticks the
 *   "I copied it" confirm checkbox,
 * - a revoked key stops working immediately — a subsequent call to
 *   /api/mcp with that key returns 401.
 */
test.describe("Settings → Agent Access @p1", () => {
  test("admin can mint a read-scoped key, gated copy-once dialog, list, and revoke", async ({
    adminPage,
    baseURL,
  }) => {
    await adminPage.goto("/settings/agent-access");

    // Section title renders.
    await expect(adminPage.locator("h2").first()).toBeVisible({
      timeout: 15_000,
    });

    const keyName = `e2e-${Date.now()}`;

    // 1. Mint — name + default scope (read) + default expiry (90).
    await adminPage
      .getByLabel(/Key name/i)
      .first()
      .fill(keyName);
    await adminPage.getByRole("button", { name: /Mint key/i }).click();

    // 2. Reveal dialog opens with the secret visible.
    const dialog = adminPage.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const secretLocator = dialog.locator("code").first();
    const secret = (await secretLocator.textContent())?.trim();
    expect(secret, "secret should be revealed once").toBeTruthy();
    expect(secret!.length).toBeGreaterThan(10);

    // 3. Done button is disabled until the confirm checkbox is ticked.
    const doneButton = dialog.getByTestId("agent-reveal-done");
    await expect(doneButton).toBeDisabled();

    // 4. Esc and overlay click do NOT close the dialog.
    await adminPage.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    // 5. Tick confirm + close via Done.
    await dialog.getByRole("checkbox").click();
    await expect(doneButton).toBeEnabled();
    await doneButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // 6. Secret must NOT remain anywhere in the DOM — copy-once means
    // closing this dialog makes the value unrecoverable from the UI.
    expect(secret).toBeTruthy();
    const bodyText = await adminPage.locator("body").textContent();
    expect(bodyText ?? "").not.toContain(secret!);

    // 7. The key appears in the list with the chosen name and "Never used".
    const keyRow = adminPage.getByText(keyName).first();
    await expect(keyRow).toBeVisible({ timeout: 5_000 });
    await expect(adminPage.getByText(/Never used/i).first()).toBeVisible();

    // 8. Revoke via the AlertDialog. Scope the locator to the row that
    // contains the minted key's name — `.first()` on a global testid
    // selector could click the wrong row if a prior test polluted the
    // workspace with leftover keys.
    const keyRowLi = adminPage.locator("li").filter({ hasText: keyName });
    const revokeButton = keyRowLi.locator(
      `[data-testid^="agent-key-revoke-"]`
    );
    await revokeButton.click();
    const alert = adminPage.getByRole("alertdialog");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(keyName);
    await alert.getByRole("button", { name: /^Revoke$/i }).click();

    // 9. The key disappears from the list.
    await expect(adminPage.getByText(keyName)).not.toBeVisible({
      timeout: 10_000,
    });

    // 10. The revoked key actually stops working — call /api/mcp with it.
    // Hard-assert preconditions so a misconfigured Playwright project
    // (missing baseURL) or a regression that nulls out the secret never
    // silently skips this critical invariant.
    expect(baseURL, "Playwright baseURL must be configured").toBeTruthy();
    expect(secret, "minted secret must have been captured").toBeTruthy();
    const response = await adminPage.request.post(`${baseURL}/api/mcp`, {
      headers: { "x-api-key": secret!, "content-type": "application/json" },
      data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    });
    expect(response.status()).toBe(401);
  });

  test("non-admin member is redirected away from agent-access settings", async ({
    memberPage,
  }) => {
    await memberPage.goto("/settings/agent-access");
    await expect(memberPage).not.toHaveURL("/settings/agent-access", {
      timeout: 10_000,
    });
  });
});
