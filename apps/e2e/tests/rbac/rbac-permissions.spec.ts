import { test, expect } from "../../fixtures/test-base.js";

/**
 * RBAC permission matrix tests.
 *
 * Seed roles (global-setup):
 *   adminPage    → WorkspaceRole.ADMIN   + OrganizationMember.role OWNER
 *   readonlyPage → WorkspaceRole.READONLY + OrganizationMember.role MEMBER
 *
 * The "Sidebar server actions" tests seed a RabbitMQServer row scoped to
 * each test via the `db` fixture (auto-cleaned up in fixture teardown).
 * That ensures the sidebar renders the server-selector <Select> so the
 * RequirePermission("server:create") gate is actually exercised, not the
 * ungated empty-state button.
 */
test.describe("RBAC — Team settings access @p1", () => {
  test("admin can view the team management page", async ({ adminPage }) => {
    // /settings/team redirects to /settings/members (canonical route).
    await adminPage.goto("/settings/members");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/workspace members/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("readonly user sees a forbidden view on /settings/members", async ({
    readonlyPage,
  }) => {
    // Navigate to the canonical URL; /settings/team is a client-side redirect
    // that only resolves after React hydrates — unreliable under load.
    await readonlyPage.goto("/settings/members");
    await readonlyPage.waitForLoadState("domcontentloaded");

    // WorkspaceForbidden renders role="alert"
    await expect(readonlyPage.getByRole("alert")).toBeVisible({
      timeout: 10_000,
    });

    // Should NOT see the invite button or member list
    await expect(
      readonlyPage.getByRole("button", { name: /invite/i })
    ).not.toBeVisible();
  });
});

test.describe("RBAC — Sidebar server actions @p1", () => {
  test("admin can see the Add Server option in the server selector", async ({
    adminPage,
    db,
  }) => {
    // Seed a server so the sidebar renders the server-selector <Select>
    // instead of the no-server empty-state button. The RequirePermission
    // ("server:create") gate only lives inside the combobox.
    const prisma = await db.getClient();
    const workspace = await prisma.workspace.findFirst({
      where: { name: "E2E Test Workspace" },
    });
    const server = await prisma.rabbitMQServer.create({
      data: {
        name: "RBAC Test Server",
        host: "rabbitmq-rbac.local",
        port: 15672,
        username: "guest",
        password: "guest",
        workspaceId: workspace!.id,
      },
    });
    db.track("RabbitMQServer", server.id);

    await adminPage.goto("/");
    await adminPage.waitForLoadState("domcontentloaded");

    await adminPage.waitForSelector("[data-sidebar='sidebar']", {
      timeout: 10_000,
    });

    // Open the server-selector combobox so the SelectItems are in the DOM.
    await adminPage
      .locator("[data-sidebar='sidebar']")
      .getByRole("combobox")
      .click();

    await expect(
      adminPage.getByRole("option", { name: /add server/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("readonly user does not see the Add Server option", async ({
    readonlyPage,
    db,
  }) => {
    // Seed a server so the sidebar renders the server-selector <Select>.
    // Without a server the combobox never mounts and the assertion would be
    // vacuously true — seeding here ensures RequirePermission is actually
    // exercised and gatekeeping the SelectItem for READONLY.
    const prisma = await db.getClient();
    const workspace = await prisma.workspace.findFirst({
      where: { name: "E2E Test Workspace" },
    });
    const server = await prisma.rabbitMQServer.create({
      data: {
        name: "RBAC Test Server",
        host: "rabbitmq-rbac.local",
        port: 15672,
        username: "guest",
        password: "guest",
        workspaceId: workspace!.id,
      },
    });
    db.track("RabbitMQServer", server.id);

    await readonlyPage.goto("/");
    await readonlyPage.waitForLoadState("domcontentloaded");

    await readonlyPage.waitForSelector("[data-sidebar='sidebar']", {
      timeout: 10_000,
    });

    // Open the combobox. The seeded server item must be visible first —
    // that anchors the Select as open before asserting the gated item.
    await readonlyPage
      .locator("[data-sidebar='sidebar']")
      .getByRole("combobox")
      .click();

    await expect(
      readonlyPage.getByRole("option", { name: /rbac test server/i })
    ).toBeVisible({ timeout: 10_000 });

    // "Add server" is gated by RequirePermission("server:create"); READONLY
    // must not see it.
    await expect(
      readonlyPage.getByRole("option", { name: /add server/i })
    ).toHaveCount(0);
  });
});

test.describe("RBAC — Team tab: member list @p2", () => {
  test("admin sees both seeded members in the member list", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/team");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText("admin@e2e-test.local").first()
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      adminPage.getByText("readonly@e2e-test.local").first()
    ).toBeVisible();
  });

  test("admin sees role badges for members", async ({ adminPage }) => {
    await adminPage.goto("/settings/team");
    await adminPage.waitForLoadState("domcontentloaded");

    // Narrow to the dedicated test id so we don't false-pass on any badge
    const badges = adminPage.locator("[data-testid='member-role-badge']");
    await expect(badges.first()).toBeVisible({ timeout: 10_000 });
    await expect(badges.first()).toHaveText(
      /Owner|Admin|Member|Read-?only/i
    );
  });

  // Workspace-level email invitations were removed; the canonical path is now
  // org-level. Re-targeted to /settings/organization where OrgMembersCard
  // renders the Invite button for org owners/admins.
  test("admin sees Invite button on the organization page", async ({
    adminPage,
  }) => {
    await adminPage.goto("/settings/organization");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /^invite$/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("RBAC — Settings sidebar visibility @p2", () => {
  test("admin sees Members link in settings sidebar", async ({ adminPage }) => {
    await adminPage.goto("/settings/profile");
    await adminPage.waitForLoadState("domcontentloaded");

    // The old "Team" entry was renamed to "Members" (settings:nav.members)
    // and the route changed to /settings/members.
    await expect(
      adminPage.getByRole("link", { name: /^members$/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("readonly user does not see Members link in settings sidebar", async ({
    readonlyPage,
  }) => {
    await readonlyPage.goto("/settings/profile");
    await readonlyPage.waitForLoadState("domcontentloaded");

    // Wait for the sidebar to hydrate before asserting absence.
    await expect(
      readonlyPage.getByRole("link", { name: /profile/i })
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      readonlyPage.getByRole("link", { name: /^members$/i })
    ).not.toBeVisible();
  });
});
