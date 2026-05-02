import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures/test-base.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";
import { mockChannel } from "../../helpers/factories/channel.factory.js";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function channelsResponse(channels: ReturnType<typeof mockChannel>[]) {
  return { success: true, channels, totalChannels: channels.length };
}

async function mockConnectedState(
  page: Page,
  channels: ReturnType<typeof mockChannel>[] = []
): Promise<void> {
  await mockTrpcQuery(page, "rabbitmq.server.getServers", {
    servers: [MOCK_SERVER],
  });
  await mockTrpcQuery(
    page,
    "rabbitmq.infrastructure.getChannels",
    channelsResponse(channels)
  );
}

async function gotoChannels(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem("selectedServerId"));
  await page.goto("/channels");
  await page.waitForLoadState("domcontentloaded");
}

// ---------------------------------------------------------------------------
// Navigation & empty states
// ---------------------------------------------------------------------------

test.describe("Channels Page – Navigation @p1", () => {
  test("navigating to /channels shows the page heading", async ({
    adminPage,
  }) => {
    await mockConnectedState(adminPage);
    await gotoChannels(adminPage);

    await expect(
      adminPage.getByRole("heading", { name: /channels/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("shows no-server state when no server is configured", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.server.getServers", {
      servers: [],
    });
    await gotoChannels(adminPage);

    await expect(adminPage.getByText(/add a rabbitmq server/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows empty state when server has no channels", async ({
    adminPage,
  }) => {
    await mockConnectedState(adminPage, []);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText(/no active channels/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Channel list display
// ---------------------------------------------------------------------------

test.describe("Channels Page – List Display @p1", () => {
  test("displays connection name as the primary row identifier", async ({
    adminPage,
  }) => {
    const ch = mockChannel({
      connection_details: {
        name: "10.0.0.1:5672 -> 10.0.0.2:49152",
        peer_host: "10.0.0.2",
        peer_port: 49152,
      },
    });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(
      adminPage.getByText("10.0.0.1:5672 -> 10.0.0.2:49152")
    ).toBeVisible({ timeout: 15_000 });
  });

  test("displays channel number badge (#N) for each row", async ({
    adminPage,
  }) => {
    const ch = mockChannel({ number: 7 });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("#7")).toBeVisible({ timeout: 15_000 });
  });

  test("displays state badge for each channel", async ({ adminPage }) => {
    const ch = mockChannel({ state: "running" });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("running")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("displays unacknowledged message count in the Unacked column", async ({
    adminPage,
  }) => {
    const ch = mockChannel({ messages_unacknowledged: 42 });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("42")).toBeVisible({ timeout: 15_000 });
  });

  test("renders multiple channel rows", async ({ adminPage }) => {
    const channels = [
      mockChannel({
        name: "conn1 (1)",
        number: 1,
        connection_details: {
          name: "conn-alpha",
          peer_host: "10.0.0.1",
          peer_port: 50001,
        },
      }),
      mockChannel({
        name: "conn2 (1)",
        number: 1,
        connection_details: {
          name: "conn-beta",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("conn-alpha")).toBeVisible({
      timeout: 15_000,
    });
    await expect(adminPage.getByText("conn-beta")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Overview pill
// ---------------------------------------------------------------------------

test.describe("Channels Page – Overview Pill @p1", () => {
  test("shows 'All Running' pill when all channels are running", async ({
    adminPage,
  }) => {
    const channels = [
      mockChannel({ state: "running" }),
      mockChannel({ name: "ch2", number: 2, state: "running" }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("All Running")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows non-running count in pill when idle channels present", async ({
    adminPage,
  }) => {
    const channels = [
      mockChannel({ state: "running" }),
      mockChannel({ name: "ch2 (1)", number: 1, state: "idle" }),
      mockChannel({ name: "ch3 (1)", number: 1, state: "idle" }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText(/2 not running/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows total channel count in the overview line", async ({
    adminPage,
  }) => {
    const channels = [
      mockChannel(),
      mockChannel({ name: "ch2 (1)", number: 2 }),
      mockChannel({ name: "ch3 (1)", number: 3 }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    // "3 channels" should appear in the inline summary
    await expect(adminPage.getByText(/3/)).toBeVisible({ timeout: 15_000 });
    await expect(adminPage.getByText(/channels/i).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// State filter pills
// ---------------------------------------------------------------------------

test.describe("Channels Page – State Filter @p1", () => {
  test("shows all five state filter pills", async ({ adminPage }) => {
    await mockConnectedState(adminPage, [mockChannel()]);
    await gotoChannels(adminPage);

    // Wait for the list to render first
    await expect(adminPage.getByText("All Running")).toBeVisible({
      timeout: 15_000,
    });

    for (const label of ["All", "Running", "Idle", "Blocked", "Flow"]) {
      await expect(
        adminPage.getByRole("button", { name: label })
      ).toBeVisible();
    }
  });

  test("clicking Idle filter hides running channels", async ({ adminPage }) => {
    const channels = [
      mockChannel({
        name: "running-ch (1)",
        connection_details: {
          name: "running-connection",
          peer_host: "10.0.0.1",
          peer_port: 50001,
        },
        state: "running",
      }),
      mockChannel({
        name: "idle-ch (1)",
        connection_details: {
          name: "idle-connection",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
        state: "idle",
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("running-connection")).toBeVisible({
      timeout: 15_000,
    });

    await adminPage.getByRole("button", { name: "Idle" }).click();

    await expect(adminPage.getByText("idle-connection")).toBeVisible({
      timeout: 5_000,
    });
    await expect(adminPage.getByText("running-connection")).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("clicking All resets the filter and shows all channels", async ({
    adminPage,
  }) => {
    const channels = [
      mockChannel({
        name: "running-ch (1)",
        connection_details: {
          name: "running-connection",
          peer_host: "10.0.0.1",
          peer_port: 50001,
        },
        state: "running",
      }),
      mockChannel({
        name: "idle-ch (1)",
        connection_details: {
          name: "idle-connection",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
        state: "idle",
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("running-connection")).toBeVisible({
      timeout: 15_000,
    });

    // Filter to Idle, then reset to All
    await adminPage.getByRole("button", { name: "Idle" }).click();
    await expect(adminPage.getByText("running-connection")).not.toBeVisible({
      timeout: 5_000,
    });

    await adminPage.getByRole("button", { name: "All" }).click();
    await expect(adminPage.getByText("running-connection")).toBeVisible({
      timeout: 5_000,
    });
    await expect(adminPage.getByText("idle-connection")).toBeVisible();
  });

  test("clicking the non-running health pill activates the state filter", async ({
    adminPage,
  }) => {
    const channels = [
      mockChannel({
        name: "running-ch (1)",
        connection_details: {
          name: "running-connection",
          peer_host: "10.0.0.1",
          peer_port: 50001,
        },
        state: "running",
      }),
      mockChannel({
        name: "idle-ch (1)",
        connection_details: {
          name: "idle-connection",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
        state: "idle",
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    // Wait for pill to appear, then click it
    const pill = adminPage.getByText(/1 not running/i);
    await expect(pill).toBeVisible({ timeout: 15_000 });
    await pill.click();

    // Running channel should disappear; idle remains
    await expect(adminPage.getByText("running-connection")).not.toBeVisible({
      timeout: 5_000,
    });
    await expect(adminPage.getByText("idle-connection")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Search / filter
// ---------------------------------------------------------------------------

test.describe("Channels Page – Search @p1", () => {
  test("typing in search filters channels by connection name", async ({
    adminPage,
  }) => {
    const channels = [
      mockChannel({
        name: "alpha-conn (1)",
        connection_details: {
          name: "alpha-connection",
          peer_host: "10.0.0.1",
          peer_port: 50001,
        },
      }),
      mockChannel({
        name: "beta-conn (1)",
        connection_details: {
          name: "beta-connection",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("alpha-connection")).toBeVisible({
      timeout: 15_000,
    });

    await adminPage.getByPlaceholder(/filter by connection/i).fill("beta");

    await expect(adminPage.getByText("beta-connection")).toBeVisible({
      timeout: 5_000,
    });
    await expect(adminPage.getByText("alpha-connection")).not.toBeVisible();
  });

  test("clearing search restores all channels", async ({ adminPage }) => {
    const channels = [
      mockChannel({
        name: "alpha-conn (1)",
        connection_details: {
          name: "alpha-connection",
          peer_host: "10.0.0.1",
          peer_port: 50001,
        },
      }),
      mockChannel({
        name: "beta-conn (1)",
        connection_details: {
          name: "beta-connection",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("alpha-connection")).toBeVisible({
      timeout: 15_000,
    });

    const searchInput = adminPage.getByPlaceholder(/filter by connection/i);
    await searchInput.fill("beta");
    await expect(adminPage.getByText("alpha-connection")).not.toBeVisible({
      timeout: 5_000,
    });

    // Clear via the PixelX button (aria-label="Clear search")
    await adminPage.getByRole("button", { name: /clear search/i }).click();
    await expect(adminPage.getByText("alpha-connection")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("search filters by user", async ({ adminPage }) => {
    const channels = [
      mockChannel({ user: "alice" }),
      mockChannel({
        name: "ch2 (1)",
        number: 2,
        user: "bob",
        connection_details: {
          name: "bob-connection",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("bob-connection")).toBeVisible({
      timeout: 15_000,
    });

    await adminPage.getByPlaceholder(/filter by connection/i).fill("alice");

    await expect(adminPage.getByText("bob-connection")).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Expand row
// ---------------------------------------------------------------------------

test.describe("Channels Page – Expand Row @p1", () => {
  test("clicking a channel row expands the detail panel", async ({
    adminPage,
  }) => {
    const ch = mockChannel({
      consumer_count: 3,
      prefetch_count: 10,
      connection_details: {
        name: "expandable-connection",
        peer_host: "192.168.1.10",
        peer_port: 55000,
      },
    });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("expandable-connection")).toBeVisible({
      timeout: 15_000,
    });

    // Click the row button to expand
    await adminPage
      .getByRole("button")
      .filter({ hasText: "expandable-connection" })
      .click();

    // Detail panel should reveal consumer count
    await expect(adminPage.getByText("3")).toBeVisible({ timeout: 5_000 });
  });

  test("expanded panel shows peer host information", async ({ adminPage }) => {
    const ch = mockChannel({
      connection_details: {
        name: "peer-connection",
        peer_host: "192.168.50.99",
        peer_port: 43210,
      },
    });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("peer-connection")).toBeVisible({
      timeout: 15_000,
    });

    await adminPage
      .getByRole("button")
      .filter({ hasText: "peer-connection" })
      .click();

    await expect(adminPage.getByText("192.168.50.99:43210")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("expanded panel shows deliver rate when non-zero", async ({
    adminPage,
  }) => {
    const ch = mockChannel({
      connection_details: {
        name: "active-connection",
        peer_host: "10.0.0.1",
        peer_port: 50001,
      },
      message_stats: {
        deliver_details: { rate: 12.5 },
      },
    });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("active-connection")).toBeVisible({
      timeout: 15_000,
    });

    await adminPage
      .getByRole("button")
      .filter({ hasText: "active-connection" })
      .click();

    await expect(adminPage.getByText("12.5/s")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("clicking an expanded row collapses the detail panel", async ({
    adminPage,
  }) => {
    const ch = mockChannel({
      connection_details: {
        name: "collapsible-connection",
        peer_host: "10.0.0.1",
        peer_port: 50001,
      },
    });
    await mockConnectedState(adminPage, [ch]);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("collapsible-connection")).toBeVisible({
      timeout: 15_000,
    });

    const row = adminPage
      .getByRole("button")
      .filter({ hasText: "collapsible-connection" });

    // Expand
    await row.click();
    await expect(adminPage.getByText("10.0.0.1:50001")).toBeVisible({
      timeout: 5_000,
    });

    // Collapse
    await row.click();
    await expect(adminPage.getByText("10.0.0.1:50001")).not.toBeVisible({
      timeout: 5_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Default sort order
// ---------------------------------------------------------------------------

test.describe("Channels Page – Sort @p1", () => {
  test("channels with highest unacknowledged count appear first by default", async ({
    adminPage,
  }) => {
    const channels = [
      mockChannel({
        name: "low-unacked (1)",
        connection_details: {
          name: "low-unacked-conn",
          peer_host: "10.0.0.1",
          peer_port: 50001,
        },
        messages_unacknowledged: 1,
      }),
      mockChannel({
        name: "high-unacked (1)",
        connection_details: {
          name: "high-unacked-conn",
          peer_host: "10.0.0.2",
          peer_port: 50002,
        },
        messages_unacknowledged: 999,
      }),
    ];
    await mockConnectedState(adminPage, channels);
    await gotoChannels(adminPage);

    await expect(adminPage.getByText("high-unacked-conn")).toBeVisible({
      timeout: 15_000,
    });

    // high-unacked-conn should appear before low-unacked-conn in the DOM
    const rows = adminPage.getByRole("button").filter({ hasText: /conn$/ });
    const firstRowText = await rows.first().textContent();
    expect(firstRowText).toContain("high-unacked-conn");
  });
});
