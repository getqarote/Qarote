import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RabbitMQAlert } from "@/services/alerts/alert.interfaces";
import {
  AlertCategory,
  AlertSeverity,
} from "@/services/alerts/alert.interfaces";

import { SlackService } from "../slack.service";

vi.mock("@/core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the retry utility to call fn once immediately without actual retries
vi.mock("@/core/retry", () => ({
  retryWithBackoffAndTimeout: vi.fn(
    async (fn: (signal: AbortSignal) => Promise<unknown>) => {
      const controller = new AbortController();
      return fn(controller.signal);
    }
  ),
}));

function makeAlert(overrides: Partial<RabbitMQAlert> = {}): RabbitMQAlert {
  return {
    id: "alert-1",
    serverId: "server-1",
    serverName: "Test Server",
    severity: AlertSeverity.CRITICAL,
    category: AlertCategory.MEMORY,
    title: "High Memory",
    description: "Memory usage is high",
    details: { current: 90, threshold: 80 },
    timestamp: new Date().toISOString(),
    resolved: false,
    source: { type: "node", name: "rabbit@node1" },
    ...overrides,
  };
}

function makeResponse(
  status: number,
  text: string = "ok",
  ok?: boolean
): Response {
  return {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    statusText: String(status),
    text: () => Promise.resolve(text),
    headers: new Headers(),
  } as Response;
}

describe("SlackService", () => {
  describe("createAlertMessage", () => {
    describe("overall color selection", () => {
      it("sets color to 'danger' when any critical alert is present", () => {
        const alerts = [
          makeAlert({ severity: AlertSeverity.CRITICAL }),
          makeAlert({ severity: AlertSeverity.WARNING }),
        ];
        const message = SlackService.createAlertMessage(
          alerts,
          "My Workspace",
          "My Server"
        );
        // The first attachment is the summary with the overall color
        expect(message.attachments?.[0].color).toBe("danger");
      });

      it("sets color to 'warning' when only warning alerts are present", () => {
        const alerts = [
          makeAlert({ severity: AlertSeverity.WARNING }),
          makeAlert({ severity: AlertSeverity.WARNING }),
        ];
        const message = SlackService.createAlertMessage(
          alerts,
          "My Workspace",
          "My Server"
        );
        expect(message.attachments?.[0].color).toBe("warning");
      });

      it("sets color to 'good' when only info alerts are present", () => {
        const alerts = [makeAlert({ severity: AlertSeverity.INFO })];
        const message = SlackService.createAlertMessage(
          alerts,
          "My Workspace",
          "My Server"
        );
        expect(message.attachments?.[0].color).toBe("good");
      });
    });

    describe("summary text", () => {
      it("includes the alert count, server name, and workspace name in text", () => {
        const alerts = [makeAlert()];
        const message = SlackService.createAlertMessage(
          alerts,
          "Production Workspace",
          "Prod Server"
        );
        expect(message.text).toContain("1 alert");
        expect(message.text).toContain("Prod Server");
        expect(message.text).toContain("Production Workspace");
      });

      it("uses plural 'alerts' for multiple alerts", () => {
        const alerts = [makeAlert(), makeAlert({ id: "alert-2" })];
        const message = SlackService.createAlertMessage(
          alerts,
          "My Workspace",
          "My Server"
        );
        expect(message.text).toContain("2 alerts");
      });
    });

    describe("summary details", () => {
      it("includes critical count in the summary attachment text", () => {
        const alerts = [
          makeAlert({ severity: AlertSeverity.CRITICAL }),
          makeAlert({ severity: AlertSeverity.CRITICAL, id: "a2" }),
        ];
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        expect(message.attachments?.[0].text).toContain("2 critical");
      });

      it("includes warning count alongside critical count", () => {
        const alerts = [
          makeAlert({ severity: AlertSeverity.CRITICAL }),
          makeAlert({ severity: AlertSeverity.WARNING, id: "a2" }),
        ];
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        expect(message.attachments?.[0].text).toContain("1 critical");
        expect(message.attachments?.[0].text).toContain("1 warning");
      });
    });

    describe("alert attachments", () => {
      it("limits attachments to 10 (plus the summary attachment)", () => {
        const alerts = Array.from({ length: 15 }, (_, i) =>
          makeAlert({ id: `alert-${i}` })
        );
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        // 1 summary + 10 alert attachments + 1 "and N more" = 12
        expect(message.attachments?.length).toBe(12);
      });

      it("appends '...and N more' attachment when alerts exceed 10", () => {
        const alerts = Array.from({ length: 12 }, (_, i) =>
          makeAlert({ id: `alert-${i}` })
        );
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        const lastAttachment =
          message.attachments?.[message.attachments.length - 1];
        expect(lastAttachment?.title).toContain("2 more");
      });

      it("does not add 'more' attachment when alerts are exactly 10", () => {
        const alerts = Array.from({ length: 10 }, (_, i) =>
          makeAlert({ id: `alert-${i}` })
        );
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        // 1 summary + 10 alert attachments = 11, no "more"
        expect(message.attachments?.length).toBe(11);
      });

      it("includes vhost field in attachment when alert has a vhost", () => {
        const alerts = [makeAlert({ vhost: "/production" })];
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        // [0] is summary, [1] is first alert attachment
        const alertAttachment = message.attachments?.[1];
        const vhostField = alertAttachment?.fields?.find(
          (f) => f.title === "Virtual Host"
        );
        expect(vhostField?.value).toBe("/production");
      });

      it("does not include vhost field when alert has no vhost", () => {
        const alerts = [makeAlert({ vhost: undefined })];
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        const alertAttachment = message.attachments?.[1];
        const vhostField = alertAttachment?.fields?.find(
          (f) => f.title === "Virtual Host"
        );
        expect(vhostField).toBeUndefined();
      });

      it("includes threshold field when alert.details.threshold is defined", () => {
        const alerts = [makeAlert({ details: { current: 90, threshold: 80 } })];
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        const alertAttachment = message.attachments?.[1];
        const thresholdField = alertAttachment?.fields?.find(
          (f) => f.title === "Threshold"
        );
        expect(thresholdField?.value).toBe("80");
      });

      it("does not include threshold field when alert.details.threshold is undefined", () => {
        const alerts = [makeAlert({ details: { current: "alarm_active" } })];
        const message = SlackService.createAlertMessage(alerts, "WS", "Server");
        const alertAttachment = message.attachments?.[1];
        const thresholdField = alertAttachment?.fields?.find(
          (f) => f.title === "Threshold"
        );
        expect(thresholdField).toBeUndefined();
      });
    });

    describe("dashboard URL", () => {
      it("builds alertsUrl with serverId and most common vhost when both provided", () => {
        const alerts = [
          makeAlert({ vhost: "/production" }),
          makeAlert({ id: "a2", vhost: "/production" }),
          makeAlert({ id: "a3", vhost: "/staging" }),
        ];
        const message = SlackService.createAlertMessage(
          alerts,
          "WS",
          "Server",
          "server-1",
          "http://app.example.com"
        );
        expect(message.blocks?.length).toBeGreaterThan(0);
        const buttonElement = (
          message.blocks?.[0] as { elements?: Array<{ url?: string }> }
        )?.elements?.[0];
        expect(buttonElement?.url).toContain("serverId=server-1");
        expect(buttonElement?.url).toContain(encodeURIComponent("/production"));
      });

      it("does not include blocks when frontendUrl is not provided", () => {
        const alerts = [makeAlert()];
        const message = SlackService.createAlertMessage(
          alerts,
          "WS",
          "Server",
          "server-1"
          // no frontendUrl
        );
        expect(message.blocks).toHaveLength(0);
      });

      it("does not include blocks when serverId is not provided", () => {
        const alerts = [makeAlert()];
        const message = SlackService.createAlertMessage(
          alerts,
          "WS",
          "Server",
          undefined,
          "http://app.example.com"
        );
        expect(message.blocks).toHaveLength(0);
      });
    });

    describe("message metadata", () => {
      it("sets username to 'Qarote Alerts'", () => {
        const message = SlackService.createAlertMessage(
          [makeAlert()],
          "WS",
          "Server"
        );
        expect(message.username).toBe("Qarote Alerts");
      });

      it("sets icon_emoji to ':rabbit:'", () => {
        const message = SlackService.createAlertMessage(
          [makeAlert()],
          "WS",
          "Server"
        );
        expect(message.icon_emoji).toBe(":rabbit:");
      });
    });
  });

  describe("sendMessage", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns success: true with statusCode on a 200 response", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, "ok"));

      const result = await SlackService.sendMessage(
        "https://hooks.slack.com/test",
        {
          text: "test",
          username: "test",
          icon_emoji: ":test:",
          blocks: [],
          attachments: [],
        }
      );

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it("calls fetch with the correct URL and POST method", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, "ok"));

      await SlackService.sendMessage("https://hooks.slack.com/webhook-url", {
        text: "hello",
        username: "test",
        icon_emoji: ":test:",
        blocks: [],
        attachments: [],
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/webhook-url",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("sends Content-Type: application/json header", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, "ok"));

      await SlackService.sendMessage("https://hooks.slack.com/test", {
        text: "test",
        username: "test",
        icon_emoji: ":test:",
        blocks: [],
        attachments: [],
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("returns success: false when fetch throws a network error", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network failure"));

      const result = await SlackService.sendMessage(
        "https://hooks.slack.com/test",
        {
          text: "test",
          username: "test",
          icon_emoji: ":test:",
          blocks: [],
          attachments: [],
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network failure");
    });

    it("returns success: false with statusCode when a 4xx error is thrown (non-retryable)", async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(400, "Bad Request", false)
      );

      const result = await SlackService.sendMessage(
        "https://hooks.slack.com/test",
        {
          text: "test",
          username: "test",
          icon_emoji: ":test:",
          blocks: [],
          attachments: [],
        }
      );

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
    });

    it("returns success: false with statusCode when a 5xx error is thrown", async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(500, "Internal Server Error", false)
      );

      const result = await SlackService.sendMessage(
        "https://hooks.slack.com/test",
        {
          text: "test",
          username: "test",
          icon_emoji: ":test:",
          blocks: [],
          attachments: [],
        }
      );

      // With our mock, retryWithBackoffAndTimeout just calls fn once - so 5xx propagates
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });
  });

  describe("sendAlertNotification", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200)));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("calls fetch with the provided webhook URL", async () => {
      const result = await SlackService.sendAlertNotification(
        "https://hooks.slack.com/test",
        [makeAlert()],
        "My Workspace",
        "My Server"
      );

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/test",
        expect.any(Object)
      );
    });
  });

  describe("sendAlertNotifications", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeResponse(200)));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("calls sendMessage for each config in the array", async () => {
      const slackConfigs = [
        { id: "slack-1", webhookUrl: "https://hooks.slack.com/hook1" },
        { id: "slack-2", webhookUrl: "https://hooks.slack.com/hook2" },
      ];

      await SlackService.sendAlertNotifications(
        slackConfigs,
        [makeAlert()],
        "My Workspace",
        "My Server"
      );

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("returns an array of { slackConfigId, result } tuples", async () => {
      const slackConfigs = [
        { id: "slack-1", webhookUrl: "https://hooks.slack.com/hook1" },
        { id: "slack-2", webhookUrl: "https://hooks.slack.com/hook2" },
      ];

      const results = await SlackService.sendAlertNotifications(
        slackConfigs,
        [makeAlert()],
        "My Workspace",
        "My Server"
      );

      expect(results).toHaveLength(2);
      expect(results[0].slackConfigId).toBe("slack-1");
      expect(results[1].slackConfigId).toBe("slack-2");
      expect(results[0].result.success).toBe(true);
    });

    it("handles rejected promises with slackConfigId 'unknown'", async () => {
      // sendMessage catches all fetch errors internally, so to exercise the
      // Promise.allSettled rejection branch we must make sendAlertNotification
      // itself throw (bypassing its internal try/catch).
      const spy = vi
        .spyOn(SlackService, "sendAlertNotification")
        .mockResolvedValueOnce({ success: true, statusCode: 200 })
        .mockRejectedValueOnce(new Error("Unexpected failure"));

      const slackConfigs = [
        { id: "slack-1", webhookUrl: "https://hooks.slack.com/hook1" },
        { id: "slack-2", webhookUrl: "https://hooks.slack.com/hook2" },
      ];

      const results = await SlackService.sendAlertNotifications(
        slackConfigs,
        [makeAlert()],
        "My Workspace",
        "My Server"
      );

      spy.mockRestore();

      expect(results).toHaveLength(2);
      const successResult = results.find((r) => r.result.success === true);
      expect(successResult).toBeDefined();
      const failedResult = results.find((r) => r.result.success !== true);
      expect(failedResult?.slackConfigId).toBe("unknown");
    });
  });
});
