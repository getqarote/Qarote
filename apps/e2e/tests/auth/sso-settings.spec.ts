import { expect, test } from "../../fixtures/test-base.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

const EXISTING_PROVIDER = {
  enabled: true,
  buttonLabel: "Sign in with SSO",
  providerId: "sso-acme-abc123",
  domain: "acme.com",
  type: "oidc" as const,
  oidcConfig: {
    discoveryEndpoint: "https://idp.acme.com/.well-known/openid-configuration",
    clientId: "qarote",
    clientSecret: "••••••••",
  },
  samlConfig: null,
};

test.describe("SSO Settings Page @p1 @adminonly", () => {
  test.describe("Access Control", () => {
    test("admin can access SSO settings page", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");

      // Should see the SSO settings heading (Shield icon area)
      await expect(
        adminPage
          .getByRole("heading")
          .filter({ hasText: /sso|single sign/i })
          .first()
      ).toBeVisible({ timeout: 15_000 });
    });

    test("non-admin user sees empty page for SSO settings", async ({
      readonlyPage,
    }) => {
      await readonlyPage.goto("/settings/sso");

      // Non-admins get null returned — SSO content should not be visible
      await expect(readonlyPage.locator("#sso-enabled")).not.toBeVisible({
        timeout: 5_000,
      });
    });
  });

  test.describe("Setup Form (no existing provider)", () => {
    test("shows OIDC fields by default", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      // In setup mode, OIDC discovery URL field should be visible
      await expect(adminPage.locator("#setup-discovery-url")).toBeVisible({
        timeout: 15_000,
      });

      await expect(adminPage.locator("#setup-client-id")).toBeVisible();
      await expect(adminPage.locator("#setup-client-secret")).toBeVisible();
      await expect(adminPage.locator("#setup-saml-metadata")).not.toBeVisible();
    });

    test("switching to SAML shows metadata URL field", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      // Wait for setup form
      await expect(adminPage.locator("#setup-discovery-url")).toBeVisible({
        timeout: 15_000,
      });

      // Switch to SAML
      await adminPage
        .getByRole("combobox")
        .filter({ hasText: /oidc/i })
        .click();
      await adminPage.getByRole("option", { name: /saml/i }).click();

      // SAML field visible, OIDC fields hidden
      await expect(adminPage.locator("#setup-saml-metadata")).toBeVisible();
      await expect(adminPage.locator("#setup-discovery-url")).not.toBeVisible();
      await expect(adminPage.locator("#setup-client-id")).not.toBeVisible();
    });

    test("shows 'callback URLs available after save' message instead of placeholder URLs", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      await expect(adminPage.locator("#setup-discovery-url")).toBeVisible({
        timeout: 15_000,
      });

      // Should NOT show a real or placeholder callback URL — only the "after save" note
      await expect(
        adminPage.getByText(/\/api\/auth\/sso\/(callback|saml2)/)
      ).not.toBeVisible();
      await expect(
        adminPage.getByText(/callback urls will be available after saving/i)
      ).toBeVisible();
    });
  });

  test.describe("Edit Form (existing provider)", () => {
    test.beforeEach(async ({ adminPage }) => {
      await mockTrpcQuery(
        adminPage,
        "sso.getProviderConfig",
        EXISTING_PROVIDER
      );
    });

    test("shows real callback URLs once a provider is configured", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      // Edit form shows real /api/auth/sso/callback/{providerId}
      await expect(
        adminPage.getByText(
          new RegExp(`/api/auth/sso/callback/${EXISTING_PROVIDER.providerId}`)
        )
      ).toBeVisible({ timeout: 15_000 });
    });

    test("pre-fills OIDC fields from existing provider config", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      await expect(adminPage.locator("#discovery-url")).toHaveValue(
        EXISTING_PROVIDER.oidcConfig.discoveryEndpoint,
        { timeout: 15_000 }
      );
      await expect(adminPage.locator("#client-id")).toHaveValue(
        EXISTING_PROVIDER.oidcConfig.clientId
      );
    });

    test("delete button opens confirmation dialog", async ({ adminPage }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      // Wait for edit form (has SSO enabled switch)
      await expect(adminPage.locator("#sso-enabled")).toBeVisible({
        timeout: 15_000,
      });

      await adminPage
        .getByRole("button", { name: /delete provider/i })
        .click();

      // AlertDialog should appear — not native confirm()
      await expect(
        adminPage.getByRole("alertdialog")
      ).toBeVisible();
      await expect(
        adminPage.getByText(/this will disable sso for all users/i)
      ).toBeVisible();
    });

    test("cancelling delete dialog keeps provider intact", async ({
      adminPage,
    }) => {
      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      await expect(adminPage.locator("#sso-enabled")).toBeVisible({
        timeout: 15_000,
      });

      await adminPage
        .getByRole("button", { name: /delete provider/i })
        .click();
      await expect(adminPage.getByRole("alertdialog")).toBeVisible();

      await adminPage.getByRole("button", { name: /cancel/i }).click();

      // Dialog dismissed, edit form still visible
      await expect(adminPage.getByRole("alertdialog")).not.toBeVisible();
      await expect(adminPage.locator("#sso-enabled")).toBeVisible();
    });
  });

  test.describe("Enterprise gate @p2", () => {
    test("non-enterprise admin gets forbidden error on save", async ({
      adminPage,
    }) => {
      await mockTrpcQuery(adminPage, "sso.registerProvider", {
        error: {
          json: {
            message: "SSO requires Enterprise plan",
            code: "FORBIDDEN",
          },
        },
      });

      await adminPage.goto("/settings/sso");
      await adminPage.waitForLoadState("domcontentloaded");

      await expect(adminPage.locator("#setup-discovery-url")).toBeVisible({
        timeout: 15_000,
      });

      await adminPage
        .locator("#setup-discovery-url")
        .fill("https://idp.example.com/.well-known/openid-configuration");
      await adminPage.locator("#setup-client-id").fill("qarote");
      await adminPage.locator("#setup-client-secret").fill("secret");

      await adminPage.getByRole("button", { name: /save/i }).click();

      await expect(
        adminPage.getByText(/enterprise/i)
      ).toBeVisible({ timeout: 5_000 });
    });
  });
});
