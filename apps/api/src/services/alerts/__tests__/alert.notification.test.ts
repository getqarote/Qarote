import { afterEach, describe, expect, it, type MockInstance, vi } from "vitest";

import {
  AlertCategory,
  AlertSeverity,
  RabbitMQAlert,
} from "../alert.interfaces";

// ---------------------------------------------------------------------------
// Module mocks (hoisted so imports in alert.notification resolve to stubs)
// ---------------------------------------------------------------------------

vi.mock("@/core/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock("@/core/logger", () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    seenAlert: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    resolvedAlert: { create: vi.fn() },
    webhook: { findFirst: vi.fn() },
    slackConfig: { findFirst: vi.fn() },
  },
}));

vi.mock("@/services/email/notification-email.service", () => ({
  NotificationEmailService: {
    sendAlertNotificationEmail: vi.fn(),
  },
}));

vi.mock("@/services/slack/slack.service", () => ({
  SlackService: {
    sendAlertNotifications: vi.fn(),
  },
}));

vi.mock("@/services/webhook/webhook.service", () => ({
  WebhookService: {
    sendAlertNotification: vi.fn(),
  },
}));

vi.mock("@/config", () => ({
  emailConfig: { frontendUrl: "http://localhost:3000" },
}));

vi.mock("@/config/features", () => ({
  FEATURES: {
    ALERTING: "alerting",
    WEBHOOK_INTEGRATION: "webhook_integration",
    SLACK_INTEGRATION: "slack_integration",
  },
}));

// ---------------------------------------------------------------------------
// Import SUT + mocked modules after mocks are set up
// ---------------------------------------------------------------------------

import { isFeatureEnabled } from "@/core/feature-flags";
import { prisma } from "@/core/prisma";

import { NotificationEmailService } from "@/services/email/notification-email.service";
import { SlackService } from "@/services/slack/slack.service";
import { WebhookService } from "@/services/webhook/webhook.service";

// Import the service last so it picks up the mocked dependencies
import { alertNotificationService } from "../alert.notification";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE_ID = "ws-1";
const SERVER_ID = "server-1";
const SERVER_NAME = "My RabbitMQ Server";

function makeAlert(overrides: Partial<RabbitMQAlert> = {}): RabbitMQAlert {
  return {
    id: "alert-id-1",
    serverId: SERVER_ID,
    serverName: SERVER_NAME,
    severity: AlertSeverity.WARNING,
    category: AlertCategory.MEMORY,
    title: "High Memory Usage",
    description: "Memory usage is high",
    details: { current: 85, threshold: 80 },
    timestamp: new Date().toISOString(),
    resolved: false,
    source: { type: "node", name: "rabbit@node1" },
    ...overrides,
  };
}

function makeWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    contactEmail: "admin@example.com",
    name: "My Workspace",
    emailNotificationsEnabled: true,
    notificationSeverities: null, // null = use default ["critical", "warning"]
    notificationServerIds: null, // null = notify all servers
    ...overrides,
  };
}

// Shorthand to cast prisma mock fields
const mockPrisma = prisma as unknown as {
  workspace: { findUnique: MockInstance };
  seenAlert: {
    findMany: MockInstance;
    upsert: MockInstance;
    updateMany: MockInstance;
  };
  resolvedAlert: { create: MockInstance };
  webhook: { findFirst: MockInstance };
  slackConfig: { findFirst: MockInstance };
};

const mockIsFeatureEnabled = isFeatureEnabled as unknown as MockInstance;
const mockSendEmail =
  NotificationEmailService.sendAlertNotificationEmail as unknown as MockInstance;
const mockSendSlack =
  SlackService.sendAlertNotifications as unknown as MockInstance;
const mockSendWebhook =
  WebhookService.sendAlertNotification as unknown as MockInstance;

// ---------------------------------------------------------------------------
// Default mock setup helpers
// ---------------------------------------------------------------------------

function setupDefaults({
  alertingEnabled = true,
  webhookEnabled = false,
  slackEnabled = false,
  workspace = makeWorkspace(),
  seenAlerts = [] as unknown[],
  unresolvedSeenAlerts = [] as unknown[],
} = {}) {
  mockIsFeatureEnabled.mockImplementation((feature: string) => {
    if (feature === "alerting") return Promise.resolve(alertingEnabled);
    if (feature === "webhook_integration")
      return Promise.resolve(webhookEnabled);
    if (feature === "slack_integration") return Promise.resolve(slackEnabled);
    return Promise.resolve(false);
  });

  mockPrisma.workspace.findUnique.mockResolvedValue(workspace);

  // First call: seenAlerts for tracking; second call: unresolvedSeenAlerts for auto-resolution
  mockPrisma.seenAlert.findMany
    .mockResolvedValueOnce(seenAlerts)
    .mockResolvedValueOnce(unresolvedSeenAlerts);

  mockPrisma.seenAlert.upsert.mockResolvedValue({});
  mockPrisma.seenAlert.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.resolvedAlert.create.mockResolvedValue({});
  mockPrisma.webhook.findFirst.mockResolvedValue(null);
  mockPrisma.slackConfig.findFirst.mockResolvedValue(null);
  mockSendEmail.mockResolvedValue(undefined);
  mockSendSlack.mockResolvedValue([{ result: { success: true } }]);
  mockSendWebhook.mockResolvedValue([
    { webhookId: "wh-1", result: { success: true } },
  ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AlertNotificationService.trackAndNotifyNewAlerts", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Workspace guard
  // -------------------------------------------------------------------------

  describe("workspace guard", () => {
    it("returns early without tracking when workspace is not found", async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);
      mockPrisma.workspace.findUnique.mockResolvedValue(null);

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.seenAlert.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.seenAlert.upsert).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Alert tracking (always, regardless of feature flags)
  // -------------------------------------------------------------------------

  describe("alert tracking", () => {
    it("creates a SeenAlert record for a brand-new alert", async () => {
      setupDefaults({ seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.seenAlert.upsert).toHaveBeenCalledOnce();
      const created = mockPrisma.seenAlert.upsert.mock.calls[0][0].create;
      expect(created.serverId).toBe(SERVER_ID);
      expect(created.workspaceId).toBe(WORKSPACE_ID);
      expect(created.category).toBe(AlertCategory.MEMORY);
      expect(created.sourceType).toBe("node");
      expect(created.sourceName).toBe("rabbit@node1");
      expect(created.resolvedAt).toBeNull();
    });

    it("updates lastSeenAt for an existing alert and clears resolvedAt", async () => {
      const existingSeenAlert = {
        fingerprint: `${SERVER_ID}-memory-node-rabbit@node1`,
        emailSentAt: new Date(),
        resolvedAt: null,
        lastSeenAt: new Date(),
        firstSeenAt: new Date(),
      };
      setupDefaults({ seenAlerts: [existingSeenAlert] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.seenAlert.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ resolvedAt: null }),
        })
      );
    });

    it("tracks alerts even when alerting feature is disabled (community mode)", async () => {
      setupDefaults({ alertingEnabled: false, seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.seenAlert.upsert).toHaveBeenCalledOnce();
    });

    it("tracks info alerts in the database even though they are excluded from notifications by default", async () => {
      setupDefaults({ seenAlerts: [] });
      const infoAlert = makeAlert({ severity: AlertSeverity.INFO });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [infoAlert],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.seenAlert.upsert).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Notification decision — new alert
  // -------------------------------------------------------------------------

  describe("new alert notification", () => {
    it("sends email for a brand-new critical alert", async () => {
      setupDefaults({ seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.CRITICAL })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("sends email for a brand-new warning alert", async () => {
      setupDefaults({ seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.WARNING })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("does NOT send email for a brand-new info alert (excluded by default severity filter)", async () => {
      setupDefaults({ seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.INFO })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("sends email for info alerts when workspace explicitly enables info severity", async () => {
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({
          notificationSeverities: ["critical", "warning", "info"],
        }),
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.INFO })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Notification decision — cooldown
  // -------------------------------------------------------------------------

  describe("cooldown period", () => {
    it("does NOT send email for an ongoing alert within the 7-day cooldown", async () => {
      const recentlySeen = {
        fingerprint: `${SERVER_ID}-memory-node-rabbit@node1`,
        emailSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        resolvedAt: null,
        lastSeenAt: new Date(),
        firstSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      };
      setupDefaults({ seenAlerts: [recentlySeen] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("sends email again after the 7-day cooldown expires", async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const oldSeenAlert = {
        fingerprint: `${SERVER_ID}-memory-node-rabbit@node1`,
        emailSentAt: eightDaysAgo,
        resolvedAt: null,
        lastSeenAt: new Date(),
        firstSeenAt: eightDaysAgo,
      };
      setupDefaults({ seenAlerts: [oldSeenAlert] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("uses firstSeenAt as the cooldown reference when emailSentAt is null", async () => {
      // Alert was seen 8 days ago but no email was ever sent (e.g. notifications were off)
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const seenNoEmail = {
        fingerprint: `${SERVER_ID}-memory-node-rabbit@node1`,
        emailSentAt: null,
        resolvedAt: null,
        lastSeenAt: new Date(),
        firstSeenAt: eightDaysAgo,
      };
      setupDefaults({ seenAlerts: [seenNoEmail] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("does NOT send when firstSeenAt is recent and emailSentAt is null", async () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const seenNoEmail = {
        fingerprint: `${SERVER_ID}-memory-node-rabbit@node1`,
        emailSentAt: null,
        resolvedAt: null,
        lastSeenAt: new Date(),
        firstSeenAt: oneDayAgo,
      };
      setupDefaults({ seenAlerts: [seenNoEmail] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Notification decision — resolved and returned
  // -------------------------------------------------------------------------

  describe("resolved alert returning", () => {
    it("sends email when a previously resolved alert comes back", async () => {
      const resolvedAlert = {
        fingerprint: `${SERVER_ID}-memory-node-rabbit@node1`,
        emailSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // within cooldown
        resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // was resolved 12h ago
        lastSeenAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        firstSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      };
      setupDefaults({ seenAlerts: [resolvedAlert] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // resolvedAt is cleared in DB via upsert
      expect(mockPrisma.seenAlert.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ resolvedAt: null }),
        })
      );
      // Email should be sent
      expect(mockSendEmail).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Workspace notification settings
  // -------------------------------------------------------------------------

  describe("workspace notification settings", () => {
    it("does NOT send email when emailNotificationsEnabled is false", async () => {
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({ emailNotificationsEnabled: false }),
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("does NOT send email when contactEmail is null", async () => {
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({ contactEmail: null }),
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("does NOT send email when serverId is not in notificationServerIds", async () => {
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({ notificationServerIds: ["server-other"] }),
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("sends email when notificationServerIds is an empty array (notify all servers)", async () => {
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({ notificationServerIds: [] }),
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("sends email when serverId is in notificationServerIds", async () => {
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({
          notificationServerIds: [SERVER_ID, "server-other"],
        }),
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("sends webhook even when email notifications are disabled", async () => {
      setupDefaults({
        seenAlerts: [],
        webhookEnabled: true,
        workspace: makeWorkspace({ emailNotificationsEnabled: false }),
      });
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: "wh-1",
        url: "https://example.com/hook",
        secret: null,
        version: "v1",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendWebhook).toHaveBeenCalledOnce();
    });

    it("sends Slack even when email notifications are disabled", async () => {
      setupDefaults({
        seenAlerts: [],
        slackEnabled: true,
        workspace: makeWorkspace({ emailNotificationsEnabled: false }),
      });
      mockPrisma.slackConfig.findFirst.mockResolvedValue({
        id: "slack-1",
        webhookUrl: "https://hooks.slack.com/test",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendSlack).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Feature flag gating
  // -------------------------------------------------------------------------

  describe("feature flag gating", () => {
    it("does NOT send any notifications when ALERTING feature is disabled", async () => {
      setupDefaults({ alertingEnabled: false, seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockSendWebhook).not.toHaveBeenCalled();
      expect(mockSendSlack).not.toHaveBeenCalled();
    });

    it("does NOT send webhook when WEBHOOK_INTEGRATION feature is disabled", async () => {
      setupDefaults({ seenAlerts: [], webhookEnabled: false });
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: "wh-1",
        url: "https://example.com/hook",
        secret: null,
        version: "v1",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendWebhook).not.toHaveBeenCalled();
    });

    it("sends webhook when WEBHOOK_INTEGRATION feature is enabled and webhook exists", async () => {
      setupDefaults({ seenAlerts: [], webhookEnabled: true });
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: "wh-1",
        url: "https://example.com/hook",
        secret: null,
        version: "v1",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendWebhook).toHaveBeenCalledOnce();
    });

    it("does NOT send Slack when SLACK_INTEGRATION feature is disabled", async () => {
      setupDefaults({ seenAlerts: [], slackEnabled: false });
      mockPrisma.slackConfig.findFirst.mockResolvedValue({
        id: "slack-1",
        webhookUrl: "https://hooks.slack.com/test",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendSlack).not.toHaveBeenCalled();
    });

    it("sends Slack when SLACK_INTEGRATION feature is enabled and config exists", async () => {
      setupDefaults({ seenAlerts: [], slackEnabled: true });
      mockPrisma.slackConfig.findFirst.mockResolvedValue({
        id: "slack-1",
        webhookUrl: "https://hooks.slack.com/test",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendSlack).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // serverName param correctness (fix for shadowing bug)
  // -------------------------------------------------------------------------

  describe("serverName parameter usage", () => {
    it("passes the serverName function parameter to the email service", async () => {
      setupDefaults({ seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        "Explicitly Provided Server Name"
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          serverName: "Explicitly Provided Server Name",
        })
      );
    });

    it("passes the serverName function parameter to the webhook service", async () => {
      setupDefaults({ seenAlerts: [], webhookEnabled: true });
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: "wh-1",
        url: "https://example.com/hook",
        secret: null,
        version: "v1",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        "Webhook Server Name"
      );

      expect(mockSendWebhook).toHaveBeenCalledWith(
        expect.anything(),
        WORKSPACE_ID,
        expect.anything(),
        SERVER_ID,
        "Webhook Server Name",
        expect.anything()
      );
    });

    it("passes the serverName function parameter to the Slack service", async () => {
      setupDefaults({ seenAlerts: [], slackEnabled: true });
      mockPrisma.slackConfig.findFirst.mockResolvedValue({
        id: "slack-1",
        webhookUrl: "https://hooks.slack.com/test",
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        "Slack Server Name"
      );

      expect(mockSendSlack).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        "Slack Server Name",
        SERVER_ID,
        expect.anything()
      );
    });
  });

  // -------------------------------------------------------------------------
  // emailSentAt marking
  // -------------------------------------------------------------------------

  describe("emailSentAt tracking", () => {
    it("marks alerts as emailSentAt after a successful email send", async () => {
      setupDefaults({ seenAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      const emailSentUpdate = mockPrisma.seenAlert.updateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data: { emailSentAt?: unknown } }).data?.emailSentAt !==
          undefined
      );
      expect(emailSentUpdate).toBeDefined();
    });

    it("does NOT update emailSentAt when email send fails", async () => {
      setupDefaults({ seenAlerts: [] });
      mockSendEmail.mockRejectedValue(new Error("SMTP error"));

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      const emailSentUpdate = mockPrisma.seenAlert.updateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data: { emailSentAt?: unknown } }).data?.emailSentAt !==
          undefined
      );
      expect(emailSentUpdate).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Auto-resolution
  // -------------------------------------------------------------------------

  describe("auto-resolution", () => {
    it("marks an alert as resolved when it disappears from the active list", async () => {
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const unresolvedSeen = {
        fingerprint,
        severity: "warning",
        category: "memory",
        sourceType: "node",
        sourceName: "rabbit@node1",
        firstSeenAt: new Date(Date.now() - 30 * 60 * 1000),
      };
      setupDefaults({
        seenAlerts: [],
        unresolvedSeenAlerts: [unresolvedSeen],
      });

      // Pass an empty alerts array — nothing active, so the seen alert should resolve
      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.seenAlert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        })
      );
    });

    it("creates a ResolvedAlert record with correct serverName when an alert resolves", async () => {
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const unresolvedSeen = {
        fingerprint,
        severity: "critical",
        category: "memory",
        sourceType: "node",
        sourceName: "rabbit@node1",
        firstSeenAt: new Date(Date.now() - 60 * 60 * 1000),
      };
      setupDefaults({
        seenAlerts: [],
        unresolvedSeenAlerts: [unresolvedSeen],
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        "Resolution Server Name"
      );

      expect(mockPrisma.resolvedAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serverName: "Resolution Server Name",
            serverId: SERVER_ID,
            workspaceId: WORKSPACE_ID,
            severity: "critical",
            category: "memory",
          }),
        })
      );
    });

    it("does NOT resolve an alert that is still active", async () => {
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const unresolvedSeen = {
        fingerprint,
        severity: "warning",
        category: "memory",
        sourceType: "node",
        sourceName: "rabbit@node1",
        firstSeenAt: new Date(Date.now() - 10 * 60 * 1000),
      };
      setupDefaults({
        seenAlerts: [],
        unresolvedSeenAlerts: [unresolvedSeen],
      });

      // The alert IS still active in the current list
      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // resolvedAt should only have been set to null (clearing), not to a date value
      const resolveUpdate = mockPrisma.seenAlert.updateMany.mock.calls.find(
        (call: unknown[]) => {
          const data = (call[0] as { data: { resolvedAt?: unknown } }).data;
          return data?.resolvedAt instanceof Date;
        }
      );
      expect(resolveUpdate).toBeUndefined();
    });

    it("calculates a positive duration for the ResolvedAlert record", async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const unresolvedSeen = {
        fingerprint,
        severity: "warning",
        category: "memory",
        sourceType: "node",
        sourceName: "rabbit@node1",
        firstSeenAt: tenMinutesAgo,
      };
      setupDefaults({
        seenAlerts: [],
        unresolvedSeenAlerts: [unresolvedSeen],
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      const createCall = mockPrisma.resolvedAlert.create.mock.calls[0][0];
      expect(createCall.data.duration).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Default severity filter (fix 3)
  // -------------------------------------------------------------------------

  describe("default notificationSeverities", () => {
    it("defaults to ['critical', 'warning'] when workspace has no severity config", async () => {
      // workspace.notificationSeverities = null → default
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({ notificationSeverities: null }),
      });

      // Warning alert → should notify
      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.WARNING })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );
      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("does NOT notify for info alerts when workspace uses the default severity config", async () => {
      setupDefaults({
        seenAlerts: [],
        workspace: makeWorkspace({ notificationSeverities: null }),
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.INFO })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Multiple alerts in a single call
  // -------------------------------------------------------------------------

  describe("multiple alerts", () => {
    it("sends a single email containing all notifiable alerts", async () => {
      setupDefaults({ seenAlerts: [] });

      const alerts = [
        makeAlert({
          category: AlertCategory.MEMORY,
          source: { type: "node", name: "rabbit@node1" },
        }),
        makeAlert({
          category: AlertCategory.DISK,
          source: { type: "node", name: "rabbit@node1" },
        }),
        makeAlert({
          severity: AlertSeverity.CRITICAL,
          category: AlertCategory.NODE,
          source: { type: "node", name: "rabbit@node1" },
        }),
      ];

      await alertNotificationService.trackAndNotifyNewAlerts(
        alerts,
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
      const emailArgs = mockSendEmail.mock.calls[0][0];
      expect(emailArgs.alerts).toHaveLength(3);
    });

    it("only sends email for notifiable alerts when some are within cooldown", async () => {
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const recentlySeen = {
        fingerprint,
        emailSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // within cooldown
        resolvedAt: null,
        lastSeenAt: new Date(),
        firstSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      };
      setupDefaults({ seenAlerts: [recentlySeen] });

      const alerts = [
        makeAlert({
          category: AlertCategory.MEMORY,
          source: { type: "node", name: "rabbit@node1" },
        }), // cooldown → skip
        makeAlert({
          category: AlertCategory.DISK,
          source: { type: "node", name: "rabbit@node2" },
        }), // new → notify
      ];

      await alertNotificationService.trackAndNotifyNewAlerts(
        alerts,
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
      const emailArgs = mockSendEmail.mock.calls[0][0];
      expect(emailArgs.alerts).toHaveLength(1);
      expect(emailArgs.alerts[0].category).toBe(AlertCategory.DISK);
    });
  });

  // -------------------------------------------------------------------------
  // Error resilience
  // -------------------------------------------------------------------------

  describe("error resilience", () => {
    it("does not throw when email service fails", async () => {
      setupDefaults({ seenAlerts: [] });
      mockSendEmail.mockRejectedValue(new Error("SMTP failure"));

      await expect(
        alertNotificationService.trackAndNotifyNewAlerts(
          [makeAlert()],
          WORKSPACE_ID,
          SERVER_ID,
          SERVER_NAME
        )
      ).resolves.not.toThrow();
    });

    it("does not throw when webhook service fails", async () => {
      setupDefaults({ seenAlerts: [], webhookEnabled: true });
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: "wh-1",
        url: "https://example.com",
        secret: null,
        version: "v1",
      });
      mockSendWebhook.mockRejectedValue(new Error("Webhook timeout"));

      await expect(
        alertNotificationService.trackAndNotifyNewAlerts(
          [makeAlert()],
          WORKSPACE_ID,
          SERVER_ID,
          SERVER_NAME
        )
      ).resolves.not.toThrow();
    });

    it("does not throw when Slack service fails", async () => {
      setupDefaults({ seenAlerts: [], slackEnabled: true });
      mockPrisma.slackConfig.findFirst.mockResolvedValue({
        id: "slack-1",
        webhookUrl: "https://hooks.slack.com/test",
      });
      mockSendSlack.mockRejectedValue(new Error("Slack unreachable"));

      await expect(
        alertNotificationService.trackAndNotifyNewAlerts(
          [makeAlert()],
          WORKSPACE_ID,
          SERVER_ID,
          SERVER_NAME
        )
      ).resolves.not.toThrow();
    });

    it("continues processing when resolvedAlert.create fails for one alert", async () => {
      const firstResolved = {
        fingerprint: `${SERVER_ID}-memory-node-rabbit@node1`,
        severity: "warning",
        category: "memory",
        sourceType: "node",
        sourceName: "rabbit@node1",
        firstSeenAt: new Date(Date.now() - 30 * 60 * 1000),
      };
      const secondResolved = {
        fingerprint: `${SERVER_ID}-disk-node-rabbit@node1`,
        severity: "critical",
        category: "disk",
        sourceType: "node",
        sourceName: "rabbit@node1",
        firstSeenAt: new Date(Date.now() - 60 * 60 * 1000),
      };
      setupDefaults({
        seenAlerts: [],
        unresolvedSeenAlerts: [firstResolved, secondResolved],
      });

      // First resolvedAlert.create fails, second should still be attempted
      mockPrisma.resolvedAlert.create
        .mockRejectedValueOnce(new Error("DB constraint"))
        .mockResolvedValueOnce({});

      await expect(
        alertNotificationService.trackAndNotifyNewAlerts(
          [],
          WORKSPACE_ID,
          SERVER_ID,
          SERVER_NAME
        )
      ).resolves.not.toThrow();

      expect(mockPrisma.resolvedAlert.create).toHaveBeenCalledTimes(2);
    });
  });
});
