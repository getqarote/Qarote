import { test, expect } from "../../fixtures/test-base.js";
import {
  uniqueEmail,
  createUser,
} from "../../helpers/factories/user.factory.js";

const apiUrl = process.env.API_URL || "http://localhost:3001";

/**
 * E2E tests for workspace-scoped RBAC enforcement (P0 security).
 *
 * Verifies that workspace-admin-only endpoints reject non-admin users
 * and that the system checks the *workspace role* (WorkspaceMember.role),
 * not the global User.role.
 */
test.describe("Workspace RBAC enforcement @p0", () => {
  let adminToken: string;
  let memberToken: string;
  let readonlyToken: string;
  let workspaceId: string;
  let memberUserId: string;

  test.beforeAll(async ({ api, db }) => {
    const prisma = await db.getClient();

    // Get workspace
    const admin = await prisma.user.findUnique({
      where: { email: "admin@e2e-test.local" },
    });
    expect(admin).toBeTruthy();
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: admin!.id },
    });
    expect(workspace).toBeTruthy();
    workspaceId = workspace!.id;

    // Login as admin
    const adminLogin = await api.login(
      "admin@e2e-test.local",
      "TestPassword123!"
    );
    adminToken = adminLogin.token;

    // Create a MEMBER user for this workspace
    const memberEmail = uniqueEmail("rbac-member");
    const { user: memberUser, password: memberPassword } = await createUser(
      prisma,
      {
        email: memberEmail,
        role: "MEMBER",
        workspaceId: workspaceId,
      }
    );
    memberUserId = memberUser.id;

    // Add workspace membership
    await prisma.workspaceMember.create({
      data: {
        userId: memberUser.id,
        workspaceId,
        role: "MEMBER",
      },
    });
    db.track("WorkspaceMember", memberUser.id);
    db.track("User", memberUser.id);

    // Login as member
    const memberLogin = await api.login(memberEmail, memberPassword);
    memberToken = memberLogin.token;

    // Login as readonly
    const readonlyLogin = await api.login(
      "readonly@e2e-test.local",
      "TestPassword123!"
    );
    readonlyToken = readonlyLogin.token;
  });

  // --- Helper to make raw tRPC calls that don't throw on error ---
  async function rawMutation(
    token: string,
    procedure: string,
    input: Record<string, unknown>
  ) {
    const response = await fetch(`${apiUrl}/trpc/${procedure}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    return {
      status: response.status,
      body: await response.json(),
    };
  }

  async function rawQuery(
    token: string,
    procedure: string,
    input?: Record<string, unknown>
  ) {
    const params = input
      ? `?input=${encodeURIComponent(JSON.stringify(input))}`
      : "";
    const response = await fetch(`${apiUrl}/trpc/${procedure}${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return {
      status: response.status,
      body: await response.json(),
    };
  }

  // --- Tests ---

  test.describe("user.getInvitations", () => {
    test("admin can fetch invitations", async () => {
      const res = await rawQuery(adminToken, "user.getInvitations", {
        workspaceId,
      });
      expect(res.status).toBe(200);
      expect(res.body.result?.data?.invitations).toBeDefined();
    });

    test("member is rejected from fetching invitations", async () => {
      const res = await rawQuery(memberToken, "user.getInvitations", {
        workspaceId,
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    test("readonly is rejected from fetching invitations", async () => {
      const res = await rawQuery(readonlyToken, "user.getInvitations", {
        workspaceId,
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });
  });

  test.describe("user.updateWorkspace", () => {
    test("admin can update workspace", async () => {
      const res = await rawMutation(adminToken, "user.updateWorkspace", {
        name: "E2E Test Workspace",
      });
      expect(res.status).toBe(200);
    });

    test("member is rejected from updating workspace", async () => {
      const res = await rawMutation(memberToken, "user.updateWorkspace", {
        name: "Hacked Workspace",
      });
      expect(res.status).toBe(403);
    });
  });

  test.describe("user.removeFromWorkspace", () => {
    test("member cannot remove other users from workspace", async () => {
      const res = await rawMutation(memberToken, "user.removeFromWorkspace", {
        userId: "nonexistent-user",
        workspaceId,
      });
      // Should be 403 (FORBIDDEN) not 404 — auth check must come first
      expect(res.status).toBe(403);
    });

    test("readonly cannot remove users from workspace", async () => {
      const res = await rawMutation(
        readonlyToken,
        "user.removeFromWorkspace",
        {
          userId: memberUserId,
          workspaceId,
        }
      );
      expect(res.status).toBe(403);
    });
  });

  test.describe("workspace.invitation.sendInvitation", () => {
    test("admin can send invitation @selfhosted", async () => {
      test.skip(
        process.env.DEPLOYMENT_MODE === "cloud",
        "Selfhosted mode only"
      );

      const authedApi = new (await import("../../helpers/api-client.js")).ApiClient(
        apiUrl
      ).withAuth(adminToken);

      const inviteEmail = uniqueEmail("rbac-invite");
      const result = await authedApi.mutation(
        "workspace.invitation.sendInvitation",
        { email: inviteEmail, role: "MEMBER" }
      );
      expect(result.inviteUrl).toBeDefined();
    });

    test("member is rejected from sending invitation", async () => {
      const res = await rawMutation(
        memberToken,
        "workspace.invitation.sendInvitation",
        { email: uniqueEmail("rbac-blocked"), role: "MEMBER" }
      );
      expect(res.status).toBe(403);
    });

    test("readonly is rejected from sending invitation", async () => {
      const res = await rawMutation(
        readonlyToken,
        "workspace.invitation.sendInvitation",
        { email: uniqueEmail("rbac-blocked-ro"), role: "MEMBER" }
      );
      expect(res.status).toBe(403);
    });
  });

  test.describe("workspace.invitation.revokeInvitation", () => {
    test("member cannot revoke invitations", async () => {
      const res = await rawMutation(
        memberToken,
        "workspace.invitation.revokeInvitation",
        { invitationId: "nonexistent" }
      );
      // Should be 403 (auth check) not 404
      expect(res.status).toBe(403);
    });
  });

  test.describe("workspace.invitation.getInvitations", () => {
    test("member cannot list invitations via invitation router", async () => {
      const res = await rawQuery(
        memberToken,
        "workspace.invitation.getInvitations"
      );
      expect(res.status).toBe(403);
    });
  });
});
