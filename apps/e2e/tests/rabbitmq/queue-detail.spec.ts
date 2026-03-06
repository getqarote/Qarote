import { test, expect } from "../../fixtures/test-base.js";
import { mockQueue } from "../../helpers/factories/queue.factory.js";
import { mockTrpcQuery } from "../../helpers/trpc-mock.js";

test.describe("Queue Detail Page @p2", () => {
  test("should show queues page heading", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByRole("heading", { name: /queues/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("should show no-server state on queues page", async ({ adminPage }) => {
    await adminPage.goto("/queues");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(
      adminPage.getByText(/no rabbitmq server configured/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Queue Detail Metrics @p2", () => {
  const mockQueueDetail = (
    overrides?: Parameters<typeof mockQueue>[0]
  ) =>
    mockQueue({
      messages: 50,
      messages_ready: 30,
      messages_unacknowledged: 20,
      consumers: 2,
      consumer_capacity: 0.85,
      memory: 2097152,
      reductions: 54321,
      message_bytes: 4096,
      ...overrides,
    });

  test("should display consumer capacity as percentage", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(
      adminPage,
      "rabbitmq.queues.getQueue",
      mockQueueDetail({ consumer_capacity: 0.85 })
    );

    await adminPage.goto("/queues/test-queue");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("85.0%")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should show correct status badge on detail page", async ({
    adminPage,
  }) => {
    await mockTrpcQuery(
      adminPage,
      "rabbitmq.queues.getQueue",
      mockQueueDetail({ state: "crashed" })
    );

    await adminPage.goto("/queues/test-queue");
    await adminPage.waitForLoadState("domcontentloaded");

    const statusCard = adminPage.locator("text=Status").locator("..");
    await expect(statusCard.getByText("Crashed")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("should display message rate labels", async ({ adminPage }) => {
    await mockTrpcQuery(
      adminPage,
      "rabbitmq.queues.getQueue",
      mockQueueDetail({
        message_stats: {
          publish_details: { rate: 5.0 },
          deliver_get_details: { rate: 4.0 },
          redeliver_details: { rate: 0.5 },
          ack_details: { rate: 3.0 },
        },
      })
    );

    await adminPage.goto("/queues/test-queue");
    await adminPage.waitForLoadState("domcontentloaded");

    await expect(adminPage.getByText("Incoming")).toBeVisible({
      timeout: 15_000,
    });
    await expect(adminPage.getByText("Deliver / Get")).toBeVisible();
    await expect(adminPage.getByText("Redelivered")).toBeVisible();
    await expect(adminPage.getByText("Ack")).toBeVisible();
  });
});
