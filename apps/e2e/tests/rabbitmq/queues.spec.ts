import { test, expect } from "../../fixtures/test-base.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

test.describe("Queue Viewing @p0", () => {
  test("should navigate to queues page", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage).toHaveURL(/\/queues/);
    await expect(
      adminPage.getByRole("heading", { name: /queues/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state when not connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Queue Status Badges @p1", () => {
  const mockQueue = (overrides: Record<string, unknown>) => ({
    name: "test-queue",
    vhost: "/",
    node: "rabbit@node1",
    type: "classic",
    state: "running",
    durable: true,
    auto_delete: false,
    exclusive: false,
    arguments: {},
    messages: 0,
    messages_ready: 0,
    messages_unacknowledged: 0,
    consumers: 0,
    memory: 1024,
    ...overrides,
  });

  test("should display Running badge from state field", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.queues.getQueues", [
      mockQueue({ state: "running", consumers: 0, messages: 0 }),
    ]);

    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("Running")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should display Stopped badge for stopped queue", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.queues.getQueues", [
      mockQueue({ state: "stopped" }),
    ]);

    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("Stopped")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should not show fabricated Paused or Waiting states", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.queues.getQueues", [
      mockQueue({ state: "running", consumers: 0, messages: 0, durable: true }),
    ]);

    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("Running")).toBeVisible({
      timeout: 15_000,
    });
    await expect(adminPage.getByText("Paused")).not.toBeVisible();
    await expect(adminPage.getByText("Waiting")).not.toBeVisible();
  });
});

test.describe("Queue Table Rate Columns @p1", () => {
  const mockQueue = (overrides: Record<string, unknown>) => ({
    name: "test-queue",
    vhost: "/",
    node: "rabbit@node1",
    type: "classic",
    state: "running",
    durable: true,
    auto_delete: false,
    exclusive: false,
    arguments: {},
    messages: 10,
    messages_ready: 8,
    messages_unacknowledged: 2,
    consumers: 1,
    memory: 1024,
    message_stats: {
      publish_details: { rate: 5.2 },
      deliver_details: { rate: 4.0 },
      deliver_get_details: { rate: 4.5 },
      ack_details: { rate: 3.8 },
      redeliver_details: { rate: 0.1 },
    },
    ...overrides,
  });

  test("should display rate column headers", async ({ adminPage }) => {
    await mockTrpcQuery(adminPage, "rabbitmq.queues.getQueues", [mockQueue({})]);

    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("columnheader", { name: "Incoming" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      adminPage.getByRole("columnheader", { name: "Deliver / Get" })
    ).toBeVisible();
    await expect(
      adminPage.getByRole("columnheader", { name: "Ack" })
    ).toBeVisible();
  });
});
