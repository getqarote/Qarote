import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    systemSetting: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

const mockReinitialize = vi.fn();
const mockLoadEffectiveConfig = vi.fn();
vi.mock("@/services/email/core-email.service", () => ({
  CoreEmailService: {
    reinitialize: (...args: unknown[]) => mockReinitialize(...args),
    loadEffectiveConfig: (...args: unknown[]) =>
      mockLoadEffectiveConfig(...args),
  },
}));

vi.mock("@/config", () => ({
  emailConfig: {
    enabled: false,
    fromEmail: "noreply@localhost",
    provider: "smtp",
    smtp: {
      host: "smtp.env.example.com",
      port: 587,
      user: "env-user",
      pass: "env-pass-value",
      service: undefined,
      oauth: {
        clientId: undefined,
        clientSecret: undefined,
        refreshToken: undefined,
      },
    },
  },
}));

let mockSelfHostedMode = true;
vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => mockSelfHostedMode,
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock rate limiter to be a passthrough
vi.mock("../../middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

// Mock plan service (imported by trpc.ts)
vi.mock("@/services/plan/plan.service", () => ({
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

// Mock workspace middleware
vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

// Mock nodemailer
const mockVerify = vi.fn();
const mockSendMail = vi.fn();
const mockClose = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      verify: mockVerify,
      sendMail: mockSendMail,
      close: mockClose,
    }),
  },
}));

// Import after mocks
const { selfhostedSmtpRouter } = await import("../selfhosted-smtp");

// --- Helpers ---

const REDACTED = "••••••••";

function makeCtx() {
  return {
    prisma: {
      systemSetting: {
        findUnique: mockFindUnique,
        upsert: mockUpsert,
      },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "admin-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
    },
    workspaceId: null,
    req: {},
  };
}

const validDbConfig = {
  enabled: true,
  host: "smtp.example.com",
  port: 587,
  user: "smtp-user",
  pass: "real-smtp-password",
  fromEmail: "noreply@example.com",
  service: undefined,
  oauthClientId: undefined,
  oauthClientSecret: undefined,
  oauthRefreshToken: undefined,
};

// --- Tests ---

describe("selfhostedSmtpRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelfHostedMode = true;
  });

  describe("getSettings", () => {
    it("returns DB settings with redacted password when DB row exists", async () => {
      mockFindUnique.mockResolvedValue({
        key: "smtp_config",
        value: JSON.stringify(validDbConfig),
      });

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("database");
      expect(result.host).toBe("smtp.example.com");
      expect(result.user).toBe("smtp-user");
      expect(result.pass).toBe(REDACTED);
      expect(result.fromEmail).toBe("noreply@example.com");
      expect(result.enabled).toBe(true);
    });

    it("falls back to env config when no DB row exists", async () => {
      mockFindUnique.mockResolvedValue(null);

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("environment");
      expect(result.host).toBe("smtp.env.example.com");
      expect(result.user).toBe("env-user");
      expect(result.pass).toBe(REDACTED);
      expect(result.fromEmail).toBe("noreply@localhost");
    });

    it("falls back to env config when DB has invalid JSON", async () => {
      mockFindUnique.mockResolvedValue({
        key: "smtp_config",
        value: "not-valid-json{{{",
      });

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("environment");
    });

    it("falls back to env config when DB has invalid schema", async () => {
      mockFindUnique.mockResolvedValue({
        key: "smtp_config",
        value: JSON.stringify({ wrong: "shape" }),
      });

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("environment");
    });

    it("returns undefined for password when DB config has no password", async () => {
      const configWithoutPass = {
        ...validDbConfig,
        pass: undefined,
      };
      mockFindUnique.mockResolvedValue({
        key: "smtp_config",
        value: JSON.stringify(configWithoutPass),
      });

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.pass).toBeUndefined();
    });

    it("redacts OAuth2 secrets when present", async () => {
      const configWithOAuth = {
        ...validDbConfig,
        oauthClientSecret: "real-oauth-secret",
        oauthRefreshToken: "real-refresh-token",
      };
      mockFindUnique.mockResolvedValue({
        key: "smtp_config",
        value: JSON.stringify(configWithOAuth),
      });

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.oauthClientSecret).toBe(REDACTED);
      expect(result.oauthRefreshToken).toBe(REDACTED);
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      await expect(caller.getSettings()).rejects.toThrow(/self-hosted/i);
    });
  });

  describe("updateSettings", () => {
    const updateInput = {
      enabled: true,
      host: "smtp.example.com",
      port: 587,
      user: "smtp-user",
      pass: "new-password",
      fromEmail: "noreply@example.com",
    };

    it("stores config and reinitializes email service", async () => {
      mockUpsert.mockResolvedValue({});

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.updateSettings(updateInput);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "smtp_config" },
        })
      );
      expect(mockReinitialize).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("preserves existing DB password when redacted placeholder is sent", async () => {
      mockFindUnique.mockResolvedValue({
        key: "smtp_config",
        value: JSON.stringify(validDbConfig),
      });
      mockUpsert.mockResolvedValue({});

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      await caller.updateSettings({
        ...updateInput,
        pass: REDACTED,
      });

      const storedValue = JSON.parse(mockUpsert.mock.calls[0][0].create.value);
      expect(storedValue.pass).toBe("real-smtp-password");
    });

    it("falls back to env password when no DB row and redacted placeholder sent", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockUpsert.mockResolvedValue({});

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      await caller.updateSettings({
        ...updateInput,
        pass: REDACTED,
      });

      const storedValue = JSON.parse(mockUpsert.mock.calls[0][0].create.value);
      expect(storedValue.pass).toBe("env-pass-value");
    });

    it("falls back to env password when DB has malformed JSON and redacted placeholder sent", async () => {
      mockFindUnique.mockResolvedValue({
        key: "smtp_config",
        value: "not-json",
      });
      mockUpsert.mockResolvedValue({});

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      await caller.updateSettings({
        ...updateInput,
        pass: REDACTED,
      });

      const storedValue = JSON.parse(mockUpsert.mock.calls[0][0].create.value);
      expect(storedValue.pass).toBe("env-pass-value");
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      await expect(caller.updateSettings(updateInput)).rejects.toThrow(
        /self-hosted/i
      );
    });
  });

  describe("testConnection", () => {
    it("returns success when SMTP verify and send succeed", async () => {
      mockLoadEffectiveConfig.mockResolvedValue({
        enabled: true,
        host: "smtp.example.com",
        port: 587,
        user: "user",
        pass: "pass",
        fromEmail: "noreply@example.com",
      });
      mockVerify.mockResolvedValue(true);
      mockSendMail.mockResolvedValue({ messageId: "test-123" });

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.testConnection({
        recipientEmail: "admin@example.com",
      });

      expect(result.success).toBe(true);
    });

    it("returns error when SMTP host is not configured", async () => {
      mockLoadEffectiveConfig.mockResolvedValue({
        enabled: true,
        host: undefined,
        port: 587,
      });

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.testConnection({
        recipientEmail: "admin@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });

    it("returns error when SMTP verify fails", async () => {
      mockLoadEffectiveConfig.mockResolvedValue({
        enabled: true,
        host: "smtp.example.com",
        port: 587,
        user: "user",
        pass: "wrong-pass",
        fromEmail: "noreply@example.com",
      });
      mockVerify.mockRejectedValue(new Error("Authentication failed"));

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      const result = await caller.testConnection({
        recipientEmail: "admin@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Authentication failed");
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedSmtpRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({ recipientEmail: "admin@example.com" })
      ).rejects.toThrow(/self-hosted/i);
    });
  });
});
