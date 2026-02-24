import { test, expect } from "../../fixtures/test-base.js";

test.describe("Connect RabbitMQ Server @p0", () => {
  test("should show add server prompt when no server connected", async ({
    adminPage,
  }) => {
    await adminPage.goto("/");
    await adminPage.waitForLoadState("networkidle");

    // The dashboard should indicate no server is connected
    await expect(
      adminPage.getByText(/add.*server|no.*server|connect.*server|get started/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should be able to add a RabbitMQ server via API", async ({
    adminPage,
    api,
  }) => {
    // Login to get token
    const { token } = await api.login(
      "admin@e2e-test.local",
      "TestPassword123!"
    );
    const authedApi = api.withAuth(token);

    // Add server via API (using E2E RabbitMQ instance)
    const rabbitmqHost = process.env.E2E_RABBITMQ_HOST || "localhost";
    const rabbitmqMgmtPort = Number(
      process.env.E2E_RABBITMQ_MGMT_PORT || "15682"
    );
    const rabbitmqAmqpPort = Number(
      process.env.E2E_RABBITMQ_AMQP_PORT || "5682"
    );

    const server = await authedApi.createServer({
      name: "E2E Test Server",
      host: rabbitmqHost,
      port: rabbitmqMgmtPort,
      amqpPort: rabbitmqAmqpPort,
      username: process.env.E2E_RABBITMQ_USER || "admin",
      password: process.env.E2E_RABBITMQ_PASS || "admin123",
      vhost: "/",
      useHttps: false,
    });

    expect(server).toBeDefined();

    // Navigate to dashboard — should now show the server
    await adminPage.goto("/");
    await adminPage.waitForLoadState("networkidle");
    await expect(
      adminPage.getByText("E2E Test Server")
    ).toBeVisible({ timeout: 15_000 });
  });
});
