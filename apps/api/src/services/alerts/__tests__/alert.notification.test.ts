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
    alert: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
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

/** Active Alert row shape returned by the first findMany call. */
function makeActiveAlertRow(
  fingerprint: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `alert-${fingerprint}`,
    fingerprint,
    emailSentAt: null as Date | null,
    firstSeenAt: new Date(Date.now() - 30 * 60 * 1000),
    ...overrides,
  };
}

/** Unresolved Alert row shape returned by the second findMany call (for auto-resolution). */
function makeUnresolvedAlertRow(
  fingerprint: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    fingerprint,
    sourceType: "node",
    sourceName: "rabbit@node1",
    firstSeenAt: new Date(Date.now() - 30 * 60 * 1000),
    ...overrides,
  };
}

// Shorthand to cast prisma mock fields
const mockPrisma = prisma as unknown as {
  workspace: { findUnique: MockInstance };
  alert: {
    findMany: MockInstance;
    create: MockInstance;
    update: MockInstance;
    updateMany: MockInstance;
  };
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
  activeAlerts = [] as unknown[], // existing ACTIVE Alert rows (first findMany)
  unresolvedAlerts = [] as unknown[], // all ACTIVE Alert rows for auto-resolution (second findMany)
} = {}) {
  mockIsFeatureEnabled.mockImplementation((feature: string) => {
    if (feature === "alerting") return Promise.resolve(alertingEnabled);
    if (feature === "webhook_integration")
      return Promise.resolve(webhookEnabled);
    if (feature === "slack_integration") return Promise.resolve(slackEnabled);
    return Promise.resolve(false);
  });

  mockPrisma.workspace.findUnique.mockResolvedValue(workspace);

  // First call: activeAlerts for notification cooldown tracking
  // Second call: unresolvedAlerts for auto-resolution
  mockPrisma.alert.findMany
    .mockResolvedValueOnce(activeAlerts)
    .mockResolvedValueOnce(unresolvedAlerts);

  mockPrisma.alert.create.mockResolvedValue({ id: "new-alert-id" });
  mockPrisma.alert.update.mockResolvedValue({});
  mockPrisma.alert.updateMany.mockResolvedValue({ count: 1 });
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

      expect(mockPrisma.alert.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Alert tracking (always, regardless of feature flags)
  // -------------------------------------------------------------------------

  describe("alert tracking", () => {
    it("creates an Alert record for a brand-new alert", async () => {
      setupDefaults({ activeAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
      const created = mockPrisma.alert.create.mock.calls[0][0].data;
      expect(created.serverId).toBe(SERVER_ID);
      expect(created.workspaceId).toBe(WORKSPACE_ID);
      expect(created.category).toBe(AlertCategory.MEMORY);
      expect(created.sourceType).toBe("node");
      expect(created.sourceName).toBe("rabbit@node1");
      expect(created.status).toBe("ACTIVE");
    });

    it("updates lastSeenAt for an existing alert and clears resolvedAt", async () => {
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const existingActiveRow = makeActiveAlertRow(fingerprint);
      setupDefaults({ activeAlerts: [existingActiveRow] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // Code uses updateMany with conditional predicate to guard against concurrent resolution
      expect(mockPrisma.alert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: existingActiveRow.id }),
          data: expect.objectContaining({
            lastSeenAt: expect.any(Date),
            resolvedAt: null,
          }),
        })
      );
      // Should not create a new row since one already exists
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    it("tracks alerts even when alerting feature is disabled (community mode)", async () => {
      setupDefaults({ alertingEnabled: false, activeAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
    });

    it("tracks info alerts in the database even though they are excluded from notifications by default", async () => {
      setupDefaults({ activeAlerts: [] });
      const infoAlert = makeAlert({ severity: AlertSeverity.INFO });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [infoAlert],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Notification decision — new alert
  // -------------------------------------------------------------------------

  describe("new alert notification", () => {
    it("sends email for a brand-new critical alert", async () => {
      setupDefaults({ activeAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.CRITICAL })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("sends email for a brand-new warning alert", async () => {
      setupDefaults({ activeAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert({ severity: AlertSeverity.WARNING })],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).toHaveBeenCalledOnce();
    });

    it("does NOT send email for a brand-new info alert (excluded by default severity filter)", async () => {
      setupDefaults({ activeAlerts: [] });

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
        activeAlerts: [],
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
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const recentlySeen = makeActiveAlertRow(fingerprint, {
        emailSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        firstSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });
      setupDefaults({ activeAlerts: [recentlySeen] });

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
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const oldActiveRow = makeActiveAlertRow(fingerprint, {
        emailSentAt: eightDaysAgo,
        firstSeenAt: eightDaysAgo,
      });
      setupDefaults({ activeAlerts: [oldActiveRow] });

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
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const seenNoEmail = makeActiveAlertRow(fingerprint, {
        emailSentAt: null,
        firstSeenAt: eightDaysAgo,
      });
      setupDefaults({ activeAlerts: [seenNoEmail] });

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
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      const seenNoEmail = makeActiveAlertRow(fingerprint, {
        emailSentAt: null,
        firstSeenAt: oneDayAgo,
      });
      setupDefaults({ activeAlerts: [seenNoEmail] });

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
      // In the unified Alert table, a resolved alert has fingerprint=NULL and
      // status=RESOLVED. When the alert re-fires, no ACTIVE row exists for
      // that fingerprint, so isNew=true and a new notification is sent even
      // if the cooldown would have prevented it for an ongoing alert.
      setupDefaults({ activeAlerts: [] }); // no active row → isNew=true

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // A new Alert row is created for the re-fired alert
      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
      // Email is sent because isNew=true
      expect(mockSendEmail).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Workspace notification settings
  // -------------------------------------------------------------------------

  describe("workspace notification settings", () => {
    it("does NOT send email when emailNotificationsEnabled is false", async () => {
      setupDefaults({
        activeAlerts: [],
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
        activeAlerts: [],
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
        activeAlerts: [],
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
        activeAlerts: [],
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
        activeAlerts: [],
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
        activeAlerts: [],
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
        activeAlerts: [],
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
      setupDefaults({ alertingEnabled: false, activeAlerts: [] });

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
      setupDefaults({ activeAlerts: [], webhookEnabled: false });
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
      setupDefaults({ activeAlerts: [], webhookEnabled: true });
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
      setupDefaults({ activeAlerts: [], slackEnabled: false });
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
      setupDefaults({ activeAlerts: [], slackEnabled: true });
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
  // serverName param correctness
  // -------------------------------------------------------------------------

  describe("serverName parameter usage", () => {
    it("passes the serverName function parameter to the email service", async () => {
      setupDefaults({ activeAlerts: [] });

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
      setupDefaults({ activeAlerts: [], webhookEnabled: true });
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
      setupDefaults({ activeAlerts: [], slackEnabled: true });
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
    it("stamps emailSentAt by alert ID (not fingerprint+status) after a successful email send", async () => {
      setupDefaults({ activeAlerts: [] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // Must use update(id) — NOT updateMany(fingerprint+status) — to avoid the
      // race where the alert resolves between email send and stamp.
      const emailSentUpdateMany = mockPrisma.alert.updateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data: { emailSentAt?: unknown } }).data?.emailSentAt !==
          undefined
      );
      expect(emailSentUpdateMany).toBeUndefined();

      const emailSentUpdate = mockPrisma.alert.update.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data: { emailSentAt?: unknown } }).data?.emailSentAt !==
          undefined
      );
      expect(emailSentUpdate).toBeDefined();
      // Must be stamped by ID, not fingerprint+status
      expect(
        (emailSentUpdate![0] as { where: { id?: string } }).where.id
      ).toBeDefined();
    });

    it("does NOT update emailSentAt when email send fails", async () => {
      setupDefaults({ activeAlerts: [] });
      mockSendEmail.mockRejectedValue(new Error("SMTP error"));

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // Neither update nor updateMany should stamp emailSentAt on failure
      const emailSentUpdateMany = mockPrisma.alert.updateMany.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data: { emailSentAt?: unknown } }).data?.emailSentAt !==
          undefined
      );
      expect(emailSentUpdateMany).toBeUndefined();

      const emailSentUpdate = mockPrisma.alert.update.mock.calls.find(
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
    it("resolves an alert via updateMany when it disappears from the active list", async () => {
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [makeUnresolvedAlertRow(fingerprint)],
      });

      // Pass an empty alerts array — nothing active, so the alert should resolve
      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.alert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ fingerprint, status: "ACTIVE" }),
          data: expect.objectContaining({
            status: "RESOLVED",
            resolvedAt: expect.any(Date),
            fingerprint: null, // releases partial unique index slot
          }),
        })
      );
    });

    it("does NOT resolve an alert that is still active", async () => {
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [makeUnresolvedAlertRow(fingerprint)],
      });

      // The alert IS still active in the current list
      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // No updateMany call with status=RESOLVED
      const resolveUpdate = mockPrisma.alert.updateMany.mock.calls.find(
        (call: unknown[]) => {
          const data = (call[0] as { data: { status?: unknown } }).data;
          return data?.status === "RESOLVED";
        }
      );
      expect(resolveUpdate).toBeUndefined();
    });

    it("calculates a positive duration when resolving", async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const fingerprint = `${SERVER_ID}-memory-node-rabbit@node1`;
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [
          makeUnresolvedAlertRow(fingerprint, { firstSeenAt: tenMinutesAgo }),
        ],
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      const resolveCall = mockPrisma.alert.updateMany.mock.calls.find(
        (call: unknown[]) => {
          const data = (call[0] as { data: { status?: unknown } }).data;
          return data?.status === "RESOLVED";
        }
      );
      expect(resolveCall?.[0].data.duration).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Vhost-scoped auto-resolution
  // -------------------------------------------------------------------------

  describe("vhost-scoped auto-resolution", () => {
    function makeQueueUnresolvedRow(
      vhost: string,
      overrides: Record<string, unknown> = {}
    ) {
      // Fingerprint format: ${serverId}-${category}-queue-${vhost}-${sourceName}
      return makeUnresolvedAlertRow(
        `${SERVER_ID}-memory-queue-${vhost}-myqueue`,
        { sourceType: "queue", sourceName: "myqueue", ...overrides }
      );
    }

    it("resolves queue alerts that match the specified vhost", async () => {
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [makeQueueUnresolvedRow("default")],
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME,
        "default"
      );

      expect(mockPrisma.alert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "RESOLVED" }),
        })
      );
    });

    it("does NOT resolve queue alerts that belong to a different vhost", async () => {
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [makeQueueUnresolvedRow("other")],
      });

      // Checking vhost "default" — alert for "other" vhost must be skipped
      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME,
        "default"
      );

      const resolveUpdate = mockPrisma.alert.updateMany.mock.calls.find(
        (call: unknown[]) => {
          const data = (call[0] as { data: { status?: unknown } }).data;
          return data?.status === "RESOLVED";
        }
      );
      expect(resolveUpdate).toBeUndefined();
    });

    it("always resolves node alerts regardless of the vhost filter", async () => {
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [
          makeUnresolvedAlertRow(`${SERVER_ID}-memory-node-rabbit@node1`),
        ],
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME,
        "default" // vhost filter specified, but node alerts are always evaluated
      );

      expect(mockPrisma.alert.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "RESOLVED" }),
        })
      );
    });

    it("is exact-boundary-safe: vhost 'foo' does not match a fingerprint whose actual vhost is 'foo-bar' (category='queue')", async () => {
      // Fingerprint: server-1-queue-queue-foo-bar-myqueue
      // Strip sourceName "myqueue" → server-1-queue-queue-foo-bar
      // Check endsWith("-queue-foo") → FALSE ✓
      const fooBarAlert = makeUnresolvedAlertRow(
        `${SERVER_ID}-queue-queue-foo-bar-myqueue`,
        { sourceType: "queue", sourceName: "myqueue" }
      );
      setupDefaults({ activeAlerts: [], unresolvedAlerts: [fooBarAlert] });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME,
        "foo"
      );

      const resolveUpdate = mockPrisma.alert.updateMany.mock.calls.find(
        (call: unknown[]) => {
          const data = (call[0] as { data: { status?: unknown } }).data;
          return data?.status === "RESOLVED";
        }
      );
      expect(resolveUpdate).toBeUndefined();
    });

    it("is exact-boundary-safe: vhost 'foo' does not match a fingerprint whose actual vhost is 'foo-bar' (category='memory')", async () => {
      // Fingerprint: server-1-memory-queue-foo-bar-myqueue
      // Strip sourceName "myqueue" → server-1-memory-queue-foo-bar
      // Check endsWith("-queue-foo") → FALSE ✓
      const fooBarMemoryAlert = makeUnresolvedAlertRow(
        `${SERVER_ID}-memory-queue-foo-bar-myqueue`,
        { sourceType: "queue", sourceName: "myqueue" }
      );
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [fooBarMemoryAlert],
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME,
        "foo"
      );

      const resolveUpdate = mockPrisma.alert.updateMany.mock.calls.find(
        (call: unknown[]) => {
          const data = (call[0] as { data: { status?: unknown } }).data;
          return data?.status === "RESOLVED";
        }
      );
      expect(resolveUpdate).toBeUndefined();
    });

    it("resolves both matching-vhost queue alerts and node alerts when vhost is specified", async () => {
      setupDefaults({
        activeAlerts: [],
        unresolvedAlerts: [
          makeQueueUnresolvedRow("default"), // matches → resolve
          makeQueueUnresolvedRow("other"), // different vhost → skip
          makeUnresolvedAlertRow(`${SERVER_ID}-memory-node-rabbit@node1`), // node → always resolve
        ],
      });

      await alertNotificationService.trackAndNotifyNewAlerts(
        [],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME,
        "default"
      );

      const resolveUpdates = mockPrisma.alert.updateMany.mock.calls.filter(
        (call: unknown[]) => {
          const data = (call[0] as { data: { status?: unknown } }).data;
          return data?.status === "RESOLVED";
        }
      );
      // "default" queue alert + node alert = 2 resolved, "other" queue alert skipped
      expect(resolveUpdates).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Batch deduplication
  // -------------------------------------------------------------------------

  describe("batch deduplication", () => {
    it("processes each fingerprint only once when the same alert appears twice in the batch", async () => {
      setupDefaults({ activeAlerts: [] });

      const alert = makeAlert();
      // Pass the same alert twice — same fingerprint
      await alertNotificationService.trackAndNotifyNewAlerts(
        [alert, alert],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // create should be called once, not twice
      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
    });

    it("sends only one notification when the same alert appears twice in the batch", async () => {
      setupDefaults({ activeAlerts: [] });

      const alert = makeAlert();
      await alertNotificationService.trackAndNotifyNewAlerts(
        [alert, alert],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // Email should be sent once with 1 alert, not twice
      expect(mockSendEmail).toHaveBeenCalledOnce();
      const emailArgs = mockSendEmail.mock.calls[0][0];
      expect(emailArgs.alerts).toHaveLength(1);
    });

    it("keeps distinct alerts when fingerprints are different", async () => {
      setupDefaults({ activeAlerts: [] });

      const alerts = [
        makeAlert({
          category: AlertCategory.MEMORY,
          source: { type: "node", name: "rabbit@node1" },
        }),
        makeAlert({
          category: AlertCategory.DISK,
          source: { type: "node", name: "rabbit@node1" },
        }),
      ];

      await alertNotificationService.trackAndNotifyNewAlerts(
        alerts,
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.alert.create).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Default severity filter
  // -------------------------------------------------------------------------

  describe("default notificationSeverities", () => {
    it("defaults to ['critical', 'warning'] when workspace has no severity config", async () => {
      // workspace.notificationSeverities = null → default
      setupDefaults({
        activeAlerts: [],
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
        activeAlerts: [],
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
      setupDefaults({ activeAlerts: [] });

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
      const recentlySeen = makeActiveAlertRow(fingerprint, {
        emailSentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // within cooldown
        firstSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });
      setupDefaults({ activeAlerts: [recentlySeen] });

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
  // Race condition resilience (concurrent P2002 on create)
  // -------------------------------------------------------------------------

  describe("race condition resilience (P2002 on create)", () => {
    function makeP2002() {
      return Object.assign(new Error("Unique constraint violation"), {
        code: "P2002",
      });
    }

    it("completes without throwing when create races with a concurrent call", async () => {
      setupDefaults({ activeAlerts: [] });
      mockPrisma.alert.create.mockRejectedValueOnce(makeP2002());

      const result = await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(result).toBeUndefined();
    });

    it("suppresses notification for the race-lost alert (the winner notifies)", async () => {
      setupDefaults({ activeAlerts: [] });
      mockPrisma.alert.create.mockRejectedValueOnce(makeP2002());

      await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("continues processing other alerts in the batch after a race-lost create", async () => {
      setupDefaults({ activeAlerts: [] });
      // First alert loses the race; second alert should still be created + notified
      mockPrisma.alert.create
        .mockRejectedValueOnce(makeP2002())
        .mockResolvedValueOnce({ id: "alert-disk-id" });

      const alerts = [
        makeAlert({
          category: AlertCategory.MEMORY,
          source: { type: "node", name: "rabbit@node1" },
        }),
        makeAlert({
          category: AlertCategory.DISK,
          source: { type: "node", name: "rabbit@node1" },
        }),
      ];

      await alertNotificationService.trackAndNotifyNewAlerts(
        alerts,
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      expect(mockPrisma.alert.create).toHaveBeenCalledTimes(2);
      // Only the disk alert (winner) triggers a notification
      expect(mockSendEmail).toHaveBeenCalledOnce();
      const emailArgs = mockSendEmail.mock.calls[0][0];
      expect(emailArgs.alerts).toHaveLength(1);
      expect(emailArgs.alerts[0].category).toBe(AlertCategory.DISK);
    });

    it("does NOT suppress the alert when create fails for a non-P2002 reason", async () => {
      // A generic DB error (not a race) should bubble to the outer catch and
      // be logged — the function still completes but remaining alerts are skipped.
      setupDefaults({ activeAlerts: [] });
      mockPrisma.alert.create.mockRejectedValueOnce(
        new Error("DB connection lost")
      );

      const result = await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );

      // Outer catch swallows the error gracefully
      expect(result).toBeUndefined();
      // No notification was sent (error aborted the batch early)
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Error resilience
  // -------------------------------------------------------------------------

  describe("error resilience", () => {
    it("does not throw when email service fails", async () => {
      setupDefaults({ activeAlerts: [] });
      mockSendEmail.mockRejectedValue(new Error("SMTP failure"));

      const result = await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );
      expect(result).toBeUndefined();
    });

    it("does not throw when webhook service fails", async () => {
      setupDefaults({ activeAlerts: [], webhookEnabled: true });
      mockPrisma.webhook.findFirst.mockResolvedValue({
        id: "wh-1",
        url: "https://example.com",
        secret: null,
        version: "v1",
      });
      mockSendWebhook.mockRejectedValue(new Error("Webhook timeout"));

      const result = await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );
      expect(result).toBeUndefined();
    });

    it("does not throw when Slack service fails", async () => {
      setupDefaults({ activeAlerts: [], slackEnabled: true });
      mockPrisma.slackConfig.findFirst.mockResolvedValue({
        id: "slack-1",
        webhookUrl: "https://hooks.slack.com/test",
      });
      mockSendSlack.mockRejectedValue(new Error("Slack unreachable"));

      const result = await alertNotificationService.trackAndNotifyNewAlerts(
        [makeAlert()],
        WORKSPACE_ID,
        SERVER_ID,
        SERVER_NAME
      );
      expect(result).toBeUndefined();
    });
  });
});
