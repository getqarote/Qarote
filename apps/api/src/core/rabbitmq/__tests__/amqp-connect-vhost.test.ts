import { beforeEach, describe, expect, it, vi } from "vitest";

import { RabbitMQAmqpClient } from "../AmqpClient";

// connect() used to build its own URL as `...:${port}${vhost}`. The default
// vhost "/" supplied the missing separator by accident; a named one did not.
const connectMock = vi.fn();

vi.mock("amqplib", () => ({
  default: {
    connect: (...args: unknown[]) => connectMock(...args),
  },
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/services/sentry", () => ({ captureRabbitMQError: vi.fn() }));

function makeConnection() {
  return {
    createChannel: vi.fn().mockResolvedValue({ on: vi.fn() }),
    on: vi.fn(),
  };
}

describe("RabbitMQAmqpClient.connect — vhost handling", () => {
  beforeEach(() => {
    connectMock.mockReset();
    connectMock.mockResolvedValue(makeConnection());
  });

  const base = {
    protocol: "amqp" as const,
    hostname: "broker.internal",
    port: 5672,
    username: "user",
    password: "pass",
    serverId: "srv-1",
    serverName: "Broker",
  };

  it("passes a named vhost as a field, never concatenated onto the port", async () => {
    await new RabbitMQAmqpClient({ ...base, vhost: "demo" }).connect();

    const [target] = connectMock.mock.calls[0];
    expect(typeof target).toBe("object");
    expect(target).toMatchObject({
      hostname: "broker.internal",
      port: 5672,
      vhost: "demo",
    });
    // The failure mode: vhost fused to the port, then parsed as the hostname.
    expect(JSON.stringify(target)).not.toContain("5672demo");
  });

  it("puts heartbeat in the connection object and timeout in socket options", async () => {
    // amqplib reads heartbeat as url.heartbeat (connect.js:126) and timeout
    // from the socket options (connect.js:98). Swapping them silently drops
    // the value — which is how heartbeats stayed disabled unnoticed.
    await new RabbitMQAmqpClient({
      ...base,
      vhost: "demo",
      heartbeat: 0,
      connectionTimeout: 0,
    }).connect();

    const [target, sockopts] = connectMock.mock.calls[0];
    expect(target).toMatchObject({ heartbeat: 0 });
    expect(sockopts).toMatchObject({ timeout: 0 });
    expect(sockopts).not.toHaveProperty("heartbeat");
  });

  it("keeps the default vhost as /", async () => {
    await new RabbitMQAmqpClient({ ...base, vhost: "/" }).connect();
    expect(connectMock.mock.calls[0][0]).toMatchObject({ vhost: "/" });
  });

  it("does not corrupt credentials containing URL-significant characters", async () => {
    // An "@" in the password used to terminate the userinfo section.
    await new RabbitMQAmqpClient({
      ...base,
      password: "p@ss:w/rd",
      vhost: "prod",
    }).connect();

    expect(connectMock.mock.calls[0][0]).toMatchObject({
      hostname: "broker.internal",
      password: "p@ss:w/rd",
      vhost: "prod",
    });
  });
});
