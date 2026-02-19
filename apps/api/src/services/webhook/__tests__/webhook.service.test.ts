import crypto from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RabbitMQAlert } from "@/services/alerts/alert.interfaces";
import {
  AlertCategory,
  AlertSeverity,
} from "@/services/alerts/alert.interfaces";

import type { WebhookPayload } from "../webhook.interfaces";
import { WebhookService } from "../webhook.service";

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const TEST_URL = "https://example.com/webhook";

function makePayload(overrides: Partial<WebhookPayload> = {}): WebhookPayload {
  return {
    version: "v1",
    event: "alert.notification",
    timestamp: "2024-01-01T00:00:00.000Z",
    workspace: { id: "ws-1", name: "My Workspace" },
    server: { id: "server-1", name: "My Server" },
    alerts: [],
    summary: { total: 0, critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

function makeResponse(status: number, bodyText = "ok"): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    text: () => Promise.resolve(bodyText),
    headers: new Headers(),
  } as Response;
}

function makeAlert(overrides: Partial<RabbitMQAlert> = {}): RabbitMQAlert {
  return {
    id: "alert-1",
    serverId: "server-1",
    serverName: "My Server",
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.MEMORY,
    title: "High Memory",
    description: "Memory is high",
    details: { current: 90, threshold: 80 },
    timestamp: new Date().toISOString(),
    resolved: false,
    source: { type: "node", name: "rabbit@node1" },
    ...overrides,
  };
}

describe("WebhookService", () => {
  describe("sendWebhook", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe("request construction", () => {
      it("sends a POST request to the provided URL", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));

        await WebhookService.sendWebhook(TEST_URL, makePayload());

        expect(fetch).toHaveBeenCalledWith(
          TEST_URL,
          expect.objectContaining({ method: "POST" })
        );
      });

      it("sets Content-Type: application/json header", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));

        await WebhookService.sendWebhook(TEST_URL, makePayload());

        expect(fetch).toHaveBeenCalledWith(
          TEST_URL,
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
      });

      it("sets X-Qarote-Event header from payload.event", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));

        await WebhookService.sendWebhook(
          TEST_URL,
          makePayload({ event: "alert.notification" })
        );

        expect(fetch).toHaveBeenCalledWith(
          TEST_URL,
          expect.objectContaining({
            headers: expect.objectContaining({
              "X-Qarote-Event": "alert.notification",
            }),
          })
        );
      });

      it("sets X-Qarote-Version header from payload.version", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));

        await WebhookService.sendWebhook(
          TEST_URL,
          makePayload({ version: "v1" })
        );

        expect(fetch).toHaveBeenCalledWith(
          TEST_URL,
          expect.objectContaining({
            headers: expect.objectContaining({ "X-Qarote-Version": "v1" }),
          })
        );
      });

      it("sets X-Qarote-Timestamp header from payload.timestamp", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));
        const ts = "2024-01-01T00:00:00.000Z";

        await WebhookService.sendWebhook(
          TEST_URL,
          makePayload({ timestamp: ts })
        );

        expect(fetch).toHaveBeenCalledWith(
          TEST_URL,
          expect.objectContaining({
            headers: expect.objectContaining({ "X-Qarote-Timestamp": ts }),
          })
        );
      });

      it("sets X-Qarote-Signature as 'sha256={hmac}' when secret is provided", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));
        const payload = makePayload();
        const secret = "my-webhook-secret";

        await WebhookService.sendWebhook(TEST_URL, payload, secret);

        const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
        const headers = callArgs.headers as Record<string, string>;
        expect(headers["X-Qarote-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
      });

      it("generates correct HMAC-SHA256 signature", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));
        const payload = makePayload();
        const secret = "my-webhook-secret";
        const payloadString = JSON.stringify(payload);

        await WebhookService.sendWebhook(TEST_URL, payload, secret);

        const expectedHmac = crypto
          .createHmac("sha256", secret)
          .update(payloadString)
          .digest("hex");

        const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
        const headers = callArgs.headers as Record<string, string>;
        expect(headers["X-Qarote-Signature"]).toBe(`sha256=${expectedHmac}`);
      });

      it("does NOT set X-Qarote-Signature when secret is null", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));

        await WebhookService.sendWebhook(TEST_URL, makePayload(), null);

        const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
        const headers = callArgs.headers as Record<string, string>;
        expect(headers["X-Qarote-Signature"]).toBeUndefined();
      });

      it("does NOT set X-Qarote-Signature when secret is undefined", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));

        await WebhookService.sendWebhook(TEST_URL, makePayload(), undefined);

        const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
        const headers = callArgs.headers as Record<string, string>;
        expect(headers["X-Qarote-Signature"]).toBeUndefined();
      });

      it("sends JSON-serialized payload as body", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));
        const payload = makePayload();

        await WebhookService.sendWebhook(TEST_URL, payload);

        expect(fetch).toHaveBeenCalledWith(
          TEST_URL,
          expect.objectContaining({ body: JSON.stringify(payload) })
        );
      });
    });

    describe("successful responses", () => {
      it("returns success: true with statusCode on 200", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(200));

        const result = await WebhookService.sendWebhook(
          TEST_URL,
          makePayload()
        );

        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.retries).toBe(0);
      });

      it("returns success: true on 204", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(204));

        const result = await WebhookService.sendWebhook(
          TEST_URL,
          makePayload()
        );

        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(204);
      });
    });

    describe("non-retryable 4xx responses", () => {
      it("returns success: false with statusCode 400 immediately", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(400));

        const result = await WebhookService.sendWebhook(
          TEST_URL,
          makePayload()
        );

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(400);
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it("returns success: false with statusCode 403 immediately", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(403));

        const result = await WebhookService.sendWebhook(
          TEST_URL,
          makePayload()
        );

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(403);
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it("returns success: false with statusCode 404 immediately", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(404));

        const result = await WebhookService.sendWebhook(
          TEST_URL,
          makePayload()
        );

        expect(result.success).toBe(false);
        expect(fetch).toHaveBeenCalledTimes(1);
      });
    });

    describe("retry behavior", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("retries on HTTP 500 and succeeds on second attempt", async () => {
        vi.mocked(fetch)
          .mockResolvedValueOnce(makeResponse(500))
          .mockResolvedValueOnce(makeResponse(200));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.success).toBe(true);
        expect(result.retries).toBe(1);
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("retries on HTTP 503", async () => {
        vi.mocked(fetch)
          .mockResolvedValueOnce(makeResponse(503))
          .mockResolvedValueOnce(makeResponse(200));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("retries on HTTP 429 (rate limiting)", async () => {
        vi.mocked(fetch)
          .mockResolvedValueOnce(makeResponse(429))
          .mockResolvedValueOnce(makeResponse(200));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("does NOT retry on HTTP 400 (calls fetch only once)", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(400));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        await promise;

        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it("does NOT retry on HTTP 403", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(403));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        await promise;

        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it("exhausts all 3 retries and returns success: false on persistent 5xx", async () => {
        vi.mocked(fetch).mockResolvedValue(makeResponse(500));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        const result = await promise;

        // MAX_RETRIES=3 means attempts: 0, 1, 2, 3 → 4 total fetch calls
        expect(result.success).toBe(false);
        expect(result.retries).toBe(3);
        expect(fetch).toHaveBeenCalledTimes(4);
      });

      it("retries on network error (fetch throws)", async () => {
        vi.mocked(fetch)
          .mockRejectedValueOnce(new Error("Connection refused"))
          .mockResolvedValueOnce(makeResponse(200));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it("returns success: false after exhausting retries on persistent network errors", async () => {
        vi.mocked(fetch).mockRejectedValue(new Error("Connection refused"));

        const promise = WebhookService.sendWebhook(TEST_URL, makePayload());
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result.success).toBe(false);
        expect(fetch).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe("sendAlertNotification", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200)));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("creates payload with version='v1' and event='alert.notification'", async () => {
      const alerts = [makeAlert()];

      await WebhookService.sendAlertNotification(
        [{ id: "hook-1", url: TEST_URL, version: "v1" }],
        "ws-1",
        "My Workspace",
        "server-1",
        "My Server",
        alerts
      );

      const body = JSON.parse(
        (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
      );
      expect(body.version).toBe("v1");
      expect(body.event).toBe("alert.notification");
    });

    it("includes workspace and server metadata in payload", async () => {
      await WebhookService.sendAlertNotification(
        [{ id: "hook-1", url: TEST_URL, version: "v1" }],
        "ws-1",
        "My Workspace",
        "server-1",
        "My Server",
        []
      );

      const body = JSON.parse(
        (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
      );
      expect(body.workspace).toEqual({ id: "ws-1", name: "My Workspace" });
      expect(body.server).toEqual({ id: "server-1", name: "My Server" });
    });

    it("calculates correct summary counts (critical/warning/info)", async () => {
      const alerts = [
        makeAlert({ severity: AlertSeverity.CRITICAL }),
        makeAlert({ id: "a2", severity: AlertSeverity.CRITICAL }),
        makeAlert({ id: "a3", severity: AlertSeverity.WARNING }),
        makeAlert({ id: "a4", severity: AlertSeverity.INFO }),
      ];

      await WebhookService.sendAlertNotification(
        [{ id: "hook-1", url: TEST_URL, version: "v1" }],
        "ws-1",
        "WS",
        "server-1",
        "Server",
        alerts
      );

      const body = JSON.parse(
        (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
      );
      expect(body.summary).toEqual({
        total: 4,
        critical: 2,
        warning: 1,
        info: 1,
      });
    });

    it("sends to all webhooks in parallel and returns [{webhookId, result}]", async () => {
      const webhooks = [
        { id: "hook-1", url: "https://example.com/hook1", version: "v1" },
        { id: "hook-2", url: "https://example.com/hook2", version: "v1" },
      ];

      const results = await WebhookService.sendAlertNotification(
        webhooks,
        "ws-1",
        "WS",
        "server-1",
        "Server",
        []
      );

      expect(results).toHaveLength(2);
      expect(results[0].webhookId).toBe("hook-1");
      expect(results[1].webhookId).toBe("hook-2");
      expect(results[0].result.success).toBe(true);
      expect(results[1].result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("handles rejected promises with webhookId 'unknown' when sendWebhook throws", async () => {
      // sendWebhook normally catches all errors internally; to test the "unknown" fallback,
      // we spy on sendWebhook to make it throw on the second call
      const sendWebhookSpy = vi
        .spyOn(WebhookService, "sendWebhook")
        .mockResolvedValueOnce({ success: true, statusCode: 200, retries: 0 })
        .mockRejectedValueOnce(new Error("Unexpected internal error"));

      const webhooks = [
        { id: "hook-1", url: "https://example.com/hook1", version: "v1" },
        { id: "hook-2", url: "https://example.com/hook2", version: "v1" },
      ];

      const results = await WebhookService.sendAlertNotification(
        webhooks,
        "ws-1",
        "WS",
        "server-1",
        "Server",
        []
      );

      const unknownResult = results.find((r) => r.webhookId === "unknown");
      expect(unknownResult).toBeDefined();
      expect(unknownResult?.result.success).toBe(false);

      sendWebhookSpy.mockRestore();
    });
  });
});
