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
vi.mock("@/services/auth/sso.service", () => ({
  ssoService: {
    reinitialize: (...args: unknown[]) => mockReinitialize(...args),
    effectiveConfig: {
      enabled: false,
      type: "oidc",
      oidc: {
        discoveryUrl:
          "https://env-idp.example.com/.well-known/openid-configuration",
        clientId: "env-client-id",
        clientSecret: "env-secret-value",
      },
      saml: { metadataUrl: undefined },
      apiUrl: "http://localhost:3000",
      frontendUrl: "http://localhost:8080",
      tenant: "default",
      product: "qarote",
      buttonLabel: "Sign in with SSO",
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

vi.mock("@/core/network", () => ({
  isPrivateIP: (ip: string) => ip === "127.0.0.1" || ip === "10.0.0.1",
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

// Mock dns.promises.lookup
vi.mock("node:dns", () => ({
  default: {
    promises: {
      lookup: vi.fn().mockResolvedValue({ address: "93.184.216.34" }),
    },
  },
}));

// Import after mocks
const { selfhostedSsoRouter } = await import("../selfhosted-sso");
const dns = await import("node:dns");

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
  type: "oidc",
  oidcDiscoveryUrl: "https://idp.example.com/.well-known/openid-configuration",
  oidcClientId: "my-client-id",
  oidcClientSecret: "real-secret-value",
  tenant: "default",
  product: "qarote",
  buttonLabel: "Sign in with SSO",
};

// --- Tests ---

describe("selfhostedSsoRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelfHostedMode = true;
  });

  describe("getSettings", () => {
    it("returns DB settings with redacted secret when DB row exists", async () => {
      mockFindUnique.mockResolvedValue({
        key: "sso_config",
        value: JSON.stringify(validDbConfig),
      });

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("database");
      expect(result.oidcClientId).toBe("my-client-id");
      expect(result.oidcClientSecret).toBe(REDACTED);
      expect(result.enabled).toBe(true);
    });

    it("falls back to env config when no DB row exists", async () => {
      mockFindUnique.mockResolvedValue(null);

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("environment");
      expect(result.oidcClientId).toBe("env-client-id");
      expect(result.oidcClientSecret).toBe(REDACTED);
    });

    it("falls back to env config when DB has invalid JSON", async () => {
      mockFindUnique.mockResolvedValue({
        key: "sso_config",
        value: "not-valid-json{{{",
      });

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("environment");
    });

    it("falls back to env config when DB has invalid schema", async () => {
      mockFindUnique.mockResolvedValue({
        key: "sso_config",
        value: JSON.stringify({ wrong: "shape" }),
      });

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.source).toBe("environment");
    });

    it("returns undefined for secret when DB config has no secret", async () => {
      const configWithoutSecret = {
        ...validDbConfig,
        oidcClientSecret: undefined,
      };
      mockFindUnique.mockResolvedValue({
        key: "sso_config",
        value: JSON.stringify(configWithoutSecret),
      });

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.getSettings();

      expect(result.oidcClientSecret).toBeUndefined();
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(caller.getSettings()).rejects.toThrow(/self-hosted/i);
    });
  });

  describe("updateSettings", () => {
    const updateInput = {
      enabled: true,
      type: "oidc" as const,
      oidcDiscoveryUrl:
        "https://idp.example.com/.well-known/openid-configuration",
      oidcClientId: "my-client-id",
      oidcClientSecret: "new-secret",
    };

    it("stores config and reinitializes SSO service", async () => {
      mockUpsert.mockResolvedValue({});
      mockReinitialize.mockResolvedValue(undefined);

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.updateSettings(updateInput);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "sso_config" },
        })
      );
      expect(mockReinitialize).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("preserves existing DB secret when redacted placeholder is sent", async () => {
      mockFindUnique.mockResolvedValue({
        key: "sso_config",
        value: JSON.stringify(validDbConfig),
      });
      mockUpsert.mockResolvedValue({});
      mockReinitialize.mockResolvedValue(undefined);

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await caller.updateSettings({
        ...updateInput,
        oidcClientSecret: REDACTED,
      });

      const storedValue = JSON.parse(mockUpsert.mock.calls[0][0].create.value);
      expect(storedValue.oidcClientSecret).toBe("real-secret-value");
    });

    it("falls back to env secret when no DB row and redacted placeholder sent", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockUpsert.mockResolvedValue({});
      mockReinitialize.mockResolvedValue(undefined);

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await caller.updateSettings({
        ...updateInput,
        oidcClientSecret: REDACTED,
      });

      const storedValue = JSON.parse(mockUpsert.mock.calls[0][0].create.value);
      expect(storedValue.oidcClientSecret).toBe("env-secret-value");
    });

    it("falls back to env secret when DB has malformed JSON and redacted placeholder sent", async () => {
      mockFindUnique.mockResolvedValue({
        key: "sso_config",
        value: "not-json",
      });
      mockUpsert.mockResolvedValue({});
      mockReinitialize.mockResolvedValue(undefined);

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await caller.updateSettings({
        ...updateInput,
        oidcClientSecret: REDACTED,
      });

      const storedValue = JSON.parse(mockUpsert.mock.calls[0][0].create.value);
      expect(storedValue.oidcClientSecret).toBe("env-secret-value");
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(caller.updateSettings(updateInput)).rejects.toThrow(
        /self-hosted/i
      );
    });
  });

  describe("testConnection", () => {
    it("rejects non-HTTPS discovery URL", async () => {
      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl:
            "http://idp.example.com/.well-known/openid-configuration",
        })
      ).rejects.toThrow(/https/i);
    });

    it("rejects localhost hostname", async () => {
      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl: "https://localhost/.well-known/openid-configuration",
        })
      ).rejects.toThrow(/local or internal/i);
    });

    it("rejects .local hostname", async () => {
      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl:
            "https://keycloak.local/.well-known/openid-configuration",
        })
      ).rejects.toThrow(/local or internal/i);
    });

    it("rejects .internal hostname", async () => {
      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl: "https://idp.internal/.well-known/openid-configuration",
        })
      ).rejects.toThrow(/local or internal/i);
    });

    it("rejects URL that resolves to private IP", async () => {
      vi.mocked(dns.default.promises.lookup).mockResolvedValueOnce({
        address: "10.0.0.1",
        family: 4,
      });

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl:
            "https://evil.example.com/.well-known/openid-configuration",
        })
      ).rejects.toThrow(/private or internal/i);
    });

    it("returns success with issuer for valid discovery URL", async () => {
      vi.mocked(dns.default.promises.lookup).mockResolvedValueOnce({
        address: "93.184.216.34",
        family: 4,
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ issuer: "https://idp.example.com" }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockResponse));

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.testConnection({
        discoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
      });

      expect(result).toEqual({
        success: true,
        issuer: "https://idp.example.com",
      });

      vi.unstubAllGlobals();
    });

    it("returns error for non-200 response", async () => {
      vi.mocked(dns.default.promises.lookup).mockResolvedValueOnce({
        address: "93.184.216.34",
        family: 4,
      });

      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockResponse));

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.testConnection({
        discoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("404");

      vi.unstubAllGlobals();
    });

    it("returns error when response is missing issuer", async () => {
      vi.mocked(dns.default.promises.lookup).mockResolvedValueOnce({
        address: "93.184.216.34",
        family: 4,
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ token_endpoint: "https://idp.example.com/token" }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(mockResponse));

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      const result = await caller.testConnection({
        discoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing issuer");

      vi.unstubAllGlobals();
    });

    it("throws FORBIDDEN when not in selfhosted mode", async () => {
      mockSelfHostedMode = false;

      const caller = selfhostedSsoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl:
            "https://idp.example.com/.well-known/openid-configuration",
        })
      ).rejects.toThrow(/self-hosted/i);
    });
  });
});
