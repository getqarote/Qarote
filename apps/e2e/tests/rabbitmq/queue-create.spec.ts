import type { Page } from "@playwright/test";

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

const MOCK_EXCHANGES_RESPONSE = {
  success: true,
  exchanges: [],
  bindings: [],
  totalExchanges: 0,
  totalBindings: 0,
  exchangeTypes: { direct: 0, fanout: 0, topic: 0, headers: 0 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Register all tRPC mocks needed to render the Queues page with a connected
 * server (so the "Create queue" button is visible).
 */
async function mockConnectedState(page: Page): Promise<void> {
  await mockTrpcQuery(page, "rabbitmq.server.getServers", {
    servers: [MOCK_SERVER],
  });
  await mockTrpcQuery(page, "rabbitmq.queues.getQueues", { queues: [] });
  await mockTrpcQuery(
    page,
    "rabbitmq.infrastructure.getExchanges",
    MOCK_EXCHANGES_RESPONSE
  );
}

/** Click the "Create queue" header button and wait for the dialog to open. */
async function openCreateQueueDialog(page: Page): Promise<void> {
  await page.getByRole("button", { name: /create queue/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10_000 });
}

/** Click a queue type radio button by its visible label. */
async function selectQueueType(page: Page, label: string): Promise<void> {
  await page
    .getByRole("radiogroup", { name: /rabbitmq queue type/i })
    .getByRole("radio", { name: label })
    .click();
}

// ---------------------------------------------------------------------------
// Queue Type Selector — UI behaviour
// ---------------------------------------------------------------------------

test.describe("Create Queue Dialog – Queue Type Selector @p1", () => {
  test.beforeEach(async ({ adminPage }) => {
    // Start each test with no persisted server selection so the mock server
    // is auto-selected by the ServerContext effect.
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedState(adminPage);
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");
  });

  test("dialog opens and shows all four queue type options", async ({
    adminPage,
  }) => {
    await openCreateQueueDialog(adminPage);

    const radiogroup = adminPage.getByRole("radiogroup", {
      name: /rabbitmq queue type/i,
    });
    await expect(radiogroup).toBeVisible({ timeout: 10_000 });
    await expect(
      radiogroup.getByRole("radio", { name: "Default" })
    ).toBeVisible();
    await expect(
      radiogroup.getByRole("radio", { name: "Classic" })
    ).toBeVisible();
    await expect(
      radiogroup.getByRole("radio", { name: "Quorum" })
    ).toBeVisible();
    await expect(
      radiogroup.getByRole("radio", { name: "Stream" })
    ).toBeVisible();
  });

  test("Default type is selected by default", async ({ adminPage }) => {
    await openCreateQueueDialog(adminPage);

    await expect(
      adminPage
        .getByRole("radiogroup", { name: /rabbitmq queue type/i })
        .getByRole("radio", { name: "Default" })
    ).toHaveAttribute("aria-checked", "true", { timeout: 10_000 });
  });

  test("preset cards are visible with Default type", async ({ adminPage }) => {
    await openCreateQueueDialog(adminPage);

    // At least one preset card should be visible in quick-create mode
    await expect(
      adminPage.getByText("Classic persistent")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("selecting Quorum hides the preset selector", async ({ adminPage }) => {
    await openCreateQueueDialog(adminPage);

    await selectQueueType(adminPage, "Quorum");

    await expect(adminPage.getByText("Classic persistent")).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(adminPage.getByText("Priority")).not.toBeVisible();
    await expect(adminPage.getByText("Transient")).not.toBeVisible();
  });

  test("selecting Stream hides the preset selector", async ({ adminPage }) => {
    await openCreateQueueDialog(adminPage);

    await selectQueueType(adminPage, "Stream");

    await expect(adminPage.getByText("Classic persistent")).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("switching back from Quorum to Default restores the preset selector", async ({
    adminPage,
  }) => {
    await openCreateQueueDialog(adminPage);

    await selectQueueType(adminPage, "Quorum");
    await expect(adminPage.getByText("Classic persistent")).not.toBeVisible({
      timeout: 10_000,
    });

    await selectQueueType(adminPage, "Default");
    await expect(adminPage.getByText("Classic persistent")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("switching back from Stream to Classic restores the preset selector", async ({
    adminPage,
  }) => {
    await openCreateQueueDialog(adminPage);

    await selectQueueType(adminPage, "Stream");
    await selectQueueType(adminPage, "Classic");

    await expect(adminPage.getByText("Classic persistent")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("preview shows (quorum) type suffix when Quorum is selected", async ({
    adminPage,
  }) => {
    await openCreateQueueDialog(adminPage);

    await adminPage
      .getByRole("textbox", { name: /queue name/i })
      .fill("my.quorum.queue");

    await selectQueueType(adminPage, "Quorum");

    // The preview card should contain "(quorum)" suffix
    await expect(adminPage.getByText(/\(quorum\)/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("preview shows (stream) type suffix when Stream is selected", async ({
    adminPage,
  }) => {
    await openCreateQueueDialog(adminPage);

    await adminPage
      .getByRole("textbox", { name: /queue name/i })
      .fill("my.stream.queue");

    await selectQueueType(adminPage, "Stream");

    await expect(adminPage.getByText(/\(stream\)/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("preview does not show type suffix for Default type", async ({
    adminPage,
  }) => {
    await openCreateQueueDialog(adminPage);

    await adminPage
      .getByRole("textbox", { name: /queue name/i })
      .fill("my.queue");

    // Default type should not append any suffix
    await expect(adminPage.getByText(/\(default\)/)).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(adminPage.getByText(/\(classic\)/)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Error handling — toast shows the RabbitMQ rejection reason
// ---------------------------------------------------------------------------

test.describe("Create Queue Dialog – Error Toast @p1", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.evaluate(() =>
      localStorage.removeItem("selectedServerId")
    );
    await mockConnectedState(adminPage);
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");
  });

  test("toast description shows RabbitMQ rejection reason, not a duplicate title", async ({
    adminPage,
  }) => {
    const rejectionReason =
      "invalid arg 'x-max-priority' for queue 'test.test' in vhost '/' of queue type rabbit_quorum_queue";

    await mockTrpcMutationError(
      adminPage,
      "rabbitmq.queues.createQueue",
      rejectionReason
    );

    await openCreateQueueDialog(adminPage);
    await adminPage
      .getByRole("textbox", { name: /queue name/i })
      .fill("test.test");

    await adminPage
      .getByRole("dialog")
      .getByRole("button", { name: /create queue/i })
      .click();

    // Toast title should appear
    await expect(adminPage.getByText("Failed to create queue")).toBeVisible({
      timeout: 10_000,
    });
    // The RabbitMQ rejection reason should appear as the description — not the
    // generic title repeated a second time.
    await expect(adminPage.getByText(/x-max-priority/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("toast appears even when no structured reason is returned", async ({
    adminPage,
  }) => {
    await mockTrpcMutationError(
      adminPage,
      "rabbitmq.queues.createQueue",
      "An unexpected error occurred"
    );

    await openCreateQueueDialog(adminPage);
    await adminPage
      .getByRole("textbox", { name: /queue name/i })
      .fill("test.queue");

    await adminPage
      .getByRole("dialog")
      .getByRole("button", { name: /create queue/i })
      .click();

    // Some error indication must be shown — no silent failure
    await expect(adminPage.getByText(/failed to create queue/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
