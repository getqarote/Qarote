import { test, expect } from "../../fixtures/test-base.js";
import {
  mockTrpcMutationError,
  mockTrpcQuery,
} from "../../helpers/trpc-mock.js";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_SERVER = {
  id: "mock-server-id",
  name: "Test RabbitMQ",
  host: "localhost",
  port: 15672,
  amqpPort: 5672,
  username: "guest",
  vhost: "/",
  useHttps: false,
  isOverQueueLimit: false,
  queueCountAtConnect: 0,
  overLimitWarningShown: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  workspaceId: "mock-workspace-id",
};

const MOCK_OVERVIEW = {
  overview: {
    cluster_name: "rabbit@node1.example.com",
    rabbitmq_version: "3.12.0",
    erlang_version: "25.0",
    management_version: "3.12.0",
    message_stats: {},
    object_totals: {
      consumers: 0,
      queues: 0,
      exchanges: 0,
      connections: 0,
      channels: 0,
    },
  },
  currentQueueCount: 0,
  queueLimit: null,
  isOverQueueLimit: false,
};

const MOCK_ORG_OWNER = {
  id: "mock-org-id",
  name: "Test Org",
  role: "OWNER",
  plan: "FREE",
  memberCount: 1,
};

const MOCK_ORG_ADMIN = {
  ...MOCK_ORG_OWNER,
  role: "ADMIN",
};

const MOCK_ORG_MEMBER = {
  ...MOCK_ORG_OWNER,
  role: "MEMBER",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register all tRPC mocks needed to render the Nodes page with a connected
 * server and a cluster name returned from the overview endpoint. */
async function mockConnectedStateWithClusterName(
  page: Parameters<typeof mockTrpcQuery>[0],
  orgData = MOCK_ORG_OWNER
): Promise<void> {
  await mockTrpcQuery(page, "rabbitmq.server.getServers", {
    servers: [MOCK_SERVER],
  });
  await mockTrpcQuery(page, "rabbitmq.overview.getOverview", MOCK_OVERVIEW);
  await mockTrpcQuery(
    page,
    "organization.management.getCurrent",
    orgData
  );
}

// ---------------------------------------------------------------------------
// Cluster name display
// ---------------------------------------------------------------------------

test.describe("Cluster Name Display @p1", () => {
  test("should display the cluster name from overview data", async ({
    adminPage,
  }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage);

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should display a 'Cluster name' label alongside the name", async ({
    adminPage,
  }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage);

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText(/cluster name/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should not show edit button when org role is MEMBER", async ({
    adminPage,
  }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_MEMBER);

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    // Cluster name should still be visible
    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });

    // But the pencil edit button must not exist
    await expect(
      adminPage.getByRole("button", { name: /edit cluster name/i })
    ).not.toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Edit button access control
// ---------------------------------------------------------------------------

test.describe("Cluster Name Edit Button Access Control @p1", () => {
  test("OWNER sees the edit (pencil) button", async ({ adminPage }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_OWNER);

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /edit cluster name/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("ADMIN sees the edit (pencil) button", async ({ adminPage }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_ADMIN);

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("button", { name: /edit cluster name/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("MEMBER does not see the edit button", async ({ readonlyPage }) => {
    await readonlyPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(readonlyPage, MOCK_ORG_MEMBER);

    await readonlyPage.goto("/nodes");
    await readonlyPage.waitForLoadState("domcontentloaded");

    // Cluster name row is visible but pencil button is hidden
    await expect(
      readonlyPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      readonlyPage.getByRole("button", { name: /edit cluster name/i })
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Inline edit mode
// ---------------------------------------------------------------------------

test.describe("Cluster Name Inline Edit @p1", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_OWNER);
    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    // Wait for the cluster name to appear before each test
    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });
  });

  test("clicking edit reveals the input field pre-populated with current name", async ({
    adminPage,
  }) => {
    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });
    await expect(input).toHaveValue("rabbit@node1.example.com");
  });

  test("clicking edit shows Save and Cancel buttons", async ({
    adminPage,
  }) => {
    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    await expect(
      adminPage.getByRole("button", { name: /^save$/i })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      adminPage.getByRole("button", { name: /^cancel$/i })
    ).toBeVisible();
  });

  test("clicking edit hides the pencil button", async ({ adminPage }) => {
    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    await expect(
      adminPage.getByRole("button", { name: /edit cluster name/i })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("pressing Escape cancels editing and restores display mode", async ({
    adminPage,
  }) => {
    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await input.press("Escape");

    await expect(input).not.toBeVisible({ timeout: 5_000 });
    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible();
    await expect(
      adminPage.getByRole("button", { name: /edit cluster name/i })
    ).toBeVisible();
  });

  test("clicking Cancel restores display mode", async ({ adminPage }) => {
    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    await expect(adminPage.getByRole("textbox")).toBeVisible({
      timeout: 5_000,
    });

    await adminPage.getByRole("button", { name: /^cancel$/i }).click();

    await expect(adminPage.getByRole("textbox")).not.toBeVisible({
      timeout: 5_000,
    });
    await expect(
      adminPage.getByRole("button", { name: /edit cluster name/i })
    ).toBeVisible();
  });

  test("Save button is disabled when input is empty", async ({
    adminPage,
  }) => {
    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Clear the field entirely
    await input.fill("");

    await expect(
      adminPage.getByRole("button", { name: /^save$/i })
    ).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Successful save
// ---------------------------------------------------------------------------

test.describe("Cluster Name Save Success @p1", () => {
  test("pressing Enter submits and shows success toast", async ({
    adminPage,
  }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_OWNER);

    // Mock the mutation to succeed
    await mockTrpcQuery(
      adminPage,
      "rabbitmq.overview.setClusterName",
      { success: true }
    );

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });

    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill("rabbit@new-name.example.com");
    await input.press("Enter");

    // Success toast
    await expect(
      adminPage.getByText(/cluster name updated/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking Save button submits and shows success toast", async ({
    adminPage,
  }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_OWNER);

    await mockTrpcQuery(
      adminPage,
      "rabbitmq.overview.setClusterName",
      { success: true }
    );

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });

    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill("rabbit@saved-by-button.example.com");

    await adminPage.getByRole("button", { name: /^save$/i }).click();

    await expect(
      adminPage.getByText(/cluster name updated/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("editing mode closes after successful save", async ({ adminPage }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_OWNER);

    await mockTrpcQuery(
      adminPage,
      "rabbitmq.overview.setClusterName",
      { success: true }
    );

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });

    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill("rabbit@new-name.example.com");
    await adminPage.getByRole("button", { name: /^save$/i }).click();

    // Input should disappear — back to display mode
    await expect(input).not.toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

test.describe("Cluster Name Save Error @p1", () => {
  test("failed mutation shows error toast", async ({ adminPage }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_OWNER);

    await mockTrpcMutationError(
      adminPage,
      "rabbitmq.overview.setClusterName",
      "Failed to set cluster name"
    );

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });

    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill("rabbit@bad-name.example.com");
    await adminPage.getByRole("button", { name: /^save$/i }).click();

    await expect(
      adminPage.getByText(/failed to update cluster name/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("editing mode remains open after a failed save", async ({
    adminPage,
  }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedStateWithClusterName(adminPage, MOCK_ORG_OWNER);

    await mockTrpcMutationError(
      adminPage,
      "rabbitmq.overview.setClusterName",
      "Failed to set cluster name"
    );

    await adminPage.goto("/nodes");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText("rabbit@node1.example.com")
    ).toBeVisible({ timeout: 15_000 });

    await adminPage
      .getByRole("button", { name: /edit cluster name/i })
      .click();

    const input = adminPage.getByRole("textbox");
    await expect(input).toBeVisible({ timeout: 5_000 });
    await input.fill("rabbit@bad-name.example.com");
    await adminPage.getByRole("button", { name: /^save$/i }).click();

    // Wait for error toast, then confirm the input is still there
    await expect(
      adminPage.getByText(/failed to update cluster name/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(input).toBeVisible();
  });
});
