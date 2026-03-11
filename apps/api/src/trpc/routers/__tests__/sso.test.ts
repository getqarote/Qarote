import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockWorkspaceFindFirst = vi.fn();
const mockSsoProviderFindUnique = vi.fn();
const mockWorkspaceSsoConfigFindFirst = vi.fn();
const mockSsoProviderUpsert = vi.fn();
const mockSsoProviderUpdate = vi.fn();
const mockSsoProviderDeleteMany = vi.fn();
const mockWorkspaceSsoConfigUpsert = vi.fn();
const mockWorkspaceSsoConfigUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: { findFirst: (...a: unknown[]) => mockWorkspaceFindFirst(...a) },
    ssoProvider: {
      findUnique: (...a: unknown[]) => mockSsoProviderFindUnique(...a),
      upsert: (...a: unknown[]) => mockSsoProviderUpsert(...a),
      update: (...a: unknown[]) => mockSsoProviderUpdate(...a),
      deleteMany: (...a: unknown[]) => mockSsoProviderDeleteMany(...a),
    },
    workspaceSsoConfig: {
      findFirst: (...a: unknown[]) => mockWorkspaceSsoConfigFindFirst(...a),
      upsert: (...a: unknown[]) => mockWorkspaceSsoConfigUpsert(...a),
      update: (...a: unknown[]) => mockWorkspaceSsoConfigUpdate(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

let mockIsCloudMode = false;
vi.mock("@/config/deployment", () => ({
  isCloudMode: () => mockIsCloudMode,
  isSelfHostedMode: () => !mockIsCloudMode,
}));

const mockGetUserPlan = vi.fn();
vi.mock("@/services/plan/plan.service", () => ({
  getUserPlan: (...a: unknown[]) => mockGetUserPlan(...a),
  PlanErrorCode: { PLAN_RESTRICTION: "PLAN_RESTRICTION" },
  PlanLimitExceededError: class extends Error {},
  PlanValidationError: class extends Error {},
}));

const mockIsFeatureEnabled = vi.fn();
vi.mock("@/core/feature-flags", () => ({
  isFeatureEnabled: (...a: unknown[]) => mockIsFeatureEnabled(...a),
}));

vi.mock("@/config/features", () => ({
  FEATURES: { SSO: "sso" },
  getAllPremiumFeatures: () => ["sso"],
  FEATURE_DESCRIPTIONS: { sso: "SSO / SAML / OIDC" },
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../middlewares/rateLimiter", () => ({
  standardRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  strictRateLimiter: (opts: { next: () => unknown }) => opts.next(),
  billingRateLimiter: (opts: { next: () => unknown }) => opts.next(),
}));

vi.mock("@/middlewares/workspace", () => ({
  hasWorkspaceAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/core/network", () => ({
  isPrivateIP: (ip: string) =>
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip === "127.0.0.1",
}));

const mockDnsLookup = vi.fn();
vi.mock("node:dns", () => ({
  default: {
    promises: {
      lookup: (...a: unknown[]) => mockDnsLookup(...a),
    },
  },
}));

// Import after mocks
const { ssoRouter } = await import("../sso");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REDACTED = "••••••••";

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    prisma: {
      workspace: { findFirst: mockWorkspaceFindFirst },
      ssoProvider: {
        findUnique: mockSsoProviderFindUnique,
        upsert: mockSsoProviderUpsert,
        update: mockSsoProviderUpdate,
        deleteMany: mockSsoProviderDeleteMany,
      },
      workspaceSsoConfig: {
        findFirst: mockWorkspaceSsoConfigFindFirst,
        upsert: mockWorkspaceSsoConfigUpsert,
        update: mockWorkspaceSsoConfigUpdate,
      },
      $transaction: mockTransaction,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    user: {
      id: "admin-1",
      role: "ADMIN",
      isActive: true,
      email: "admin@test.com",
      workspaceId: "ws-1",
    },
    workspaceId: "ws-1",
    req: {},
    locale: "en",
    ...overrides,
  };
}

const oidcConfigJson = JSON.stringify({
  issuer: "https://idp.example.com/.well-known/openid-configuration",
  discoveryEndpoint: "https://idp.example.com/.well-known/openid-configuration",
  clientId: "qarote",
  clientSecret: "super-secret",
  pkce: false,
});

const mockProvider = {
  id: "prov-1",
  providerId: "default",
  issuer: "https://idp.example.com/.well-known/openid-configuration",
  domain: "",
  oidcConfig: oidcConfigJson,
  samlConfig: null,
  domainVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockWsConfig = {
  id: "wsc-1",
  workspaceId: null,
  providerId: "default",
  enabled: true,
  buttonLabel: "Sign in with SSO",
  createdAt: new Date(),
  updatedAt: new Date(),
  ssoProvider: mockProvider,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ssoRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCloudMode = false;
    mockIsFeatureEnabled.mockResolvedValue(true);
  });

  // ─── getConfig ────────────────────────────────────────────────────────────

  describe("getConfig (public)", () => {
    it("self-hosted: returns provider info when enabled", async () => {
      mockWorkspaceSsoConfigFindFirst.mockResolvedValue(mockWsConfig);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getConfig();

      expect(result).toMatchObject({
        enabled: true,
        cloudSso: false,
        buttonLabel: "Sign in with SSO",
        providerId: "default",
        type: "oidc",
      });
    });

    it("self-hosted: returns null when not configured", async () => {
      mockWorkspaceSsoConfigFindFirst.mockResolvedValue(null);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getConfig();

      expect(result).toBeNull();
    });

    it("self-hosted: returns null when disabled", async () => {
      mockWorkspaceSsoConfigFindFirst.mockResolvedValue({
        ...mockWsConfig,
        enabled: false,
      });

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getConfig();

      expect(result).toBeNull();
    });

    it("cloud: always returns { enabled: true, cloudSso: true }", async () => {
      mockIsCloudMode = true;

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getConfig();

      expect(result).toMatchObject({
        enabled: true,
        cloudSso: true,
        buttonLabel: "Sign in with SSO",
        providerId: null,
      });
    });
  });

  // ─── getProviderConfig ────────────────────────────────────────────────────

  describe("getProviderConfig (admin)", () => {
    it("returns redacted config when provider exists", async () => {
      mockWorkspaceSsoConfigFindFirst.mockResolvedValue(mockWsConfig);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getProviderConfig();

      expect(result).toBeDefined();
      expect(result!.type).toBe("oidc");
      expect(result!.oidcConfig?.clientSecret).toBe(REDACTED);
      expect(result!.oidcConfig?.clientId).toBe("qarote");
    });

    it("returns null when no provider configured", async () => {
      mockWorkspaceSsoConfigFindFirst.mockResolvedValue(null);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getProviderConfig();

      expect(result).toBeNull();
    });

    it("cloud: looks up by workspace owner", async () => {
      mockIsCloudMode = true;
      const workspace = { id: "ws-1", ownerId: "admin-1" };
      mockWorkspaceFindFirst.mockResolvedValue(workspace);
      mockWorkspaceSsoConfigFindFirst.mockResolvedValue({
        ...mockWsConfig,
        workspaceId: "ws-1",
        providerId: "workspace-ws-1",
        ssoProvider: { ...mockProvider, providerId: "workspace-ws-1" },
      });

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getProviderConfig();

      expect(result?.providerId).toBe("workspace-ws-1");
    });
  });

  // ─── registerProvider ─────────────────────────────────────────────────────

  describe("registerProvider (ssoAdmin)", () => {
    it("self-hosted: rejects if enterprise license not present", async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { upsert: vi.fn() },
          workspaceSsoConfig: { upsert: vi.fn() },
        })
      );

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.registerProvider({
          type: "oidc",
          oidcDiscoveryUrl:
            "https://idp.example.com/.well-known/openid-configuration",
          oidcClientId: "qarote",
          oidcClientSecret: "secret",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("self-hosted: registers OIDC provider with enterprise license", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);

      const txSsoUpsert = vi.fn().mockResolvedValue({});
      const txWscUpsert = vi.fn().mockResolvedValue({});
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { upsert: txSsoUpsert },
          workspaceSsoConfig: { upsert: txWscUpsert },
        })
      );

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.registerProvider({
        type: "oidc",
        oidcDiscoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
        oidcClientId: "qarote",
        oidcClientSecret: "secret",
        buttonLabel: "Sign in with Acme",
      });

      expect(result.success).toBe(true);
      expect(result.providerId).toBe("default");
      expect(txSsoUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { providerId: "default" },
          create: expect.objectContaining({
            providerId: "default",
            oidcConfig: expect.stringContaining("discoveryEndpoint"),
          }),
        })
      );
      expect(txWscUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            workspaceId: null,
            providerId: "default",
            buttonLabel: "Sign in with Acme",
          }),
        })
      );
    });

    it("cloud: rejects non-enterprise plan", async () => {
      mockIsCloudMode = true;
      const { UserPlan } = await import("@/generated/prisma/client");
      mockWorkspaceFindFirst.mockResolvedValue({
        id: "ws-1",
        ownerId: "admin-1",
      });
      mockGetUserPlan.mockResolvedValue(UserPlan.DEVELOPER);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.registerProvider({
          type: "oidc",
          oidcDiscoveryUrl:
            "https://idp.example.com/.well-known/openid-configuration",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("throws BAD_REQUEST when OIDC missing discoveryUrl", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { upsert: vi.fn() },
          workspaceSsoConfig: { upsert: vi.fn() },
        })
      );

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await expect(caller.registerProvider({ type: "oidc" })).rejects.toThrow(
        TRPCError
      );
    });
  });

  // ─── updateProvider ───────────────────────────────────────────────────────

  describe("updateProvider (ssoAdmin)", () => {
    it("preserves client secret when REDACTED placeholder is sent", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      mockSsoProviderFindUnique.mockResolvedValue(mockProvider);

      const txSsoUpdate = vi.fn().mockResolvedValue({});
      const txWscUpdate = vi.fn().mockResolvedValue({});
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { update: txSsoUpdate },
          workspaceSsoConfig: { update: txWscUpdate },
        })
      );

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await caller.updateProvider({
        type: "oidc",
        oidcDiscoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
        oidcClientId: "qarote",
        oidcClientSecret: REDACTED, // send redacted
      });

      const updateCall = txSsoUpdate.mock.calls[0][0];
      const savedConfig = JSON.parse(updateCall.data.oidcConfig);
      expect(savedConfig.clientSecret).toBe("super-secret"); // original preserved
    });

    it("throws NOT_FOUND when provider does not exist", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      mockSsoProviderFindUnique.mockResolvedValue(null);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.updateProvider({
          type: "oidc",
          oidcDiscoveryUrl:
            "https://idp.example.com/.well-known/openid-configuration",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ─── deleteProvider ───────────────────────────────────────────────────────

  describe("deleteProvider (ssoAdmin)", () => {
    it("deletes the provider row", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      mockSsoProviderDeleteMany.mockResolvedValue({ count: 1 });

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.deleteProvider();

      expect(result.success).toBe(true);
      expect(mockSsoProviderDeleteMany).toHaveBeenCalledWith({
        where: { providerId: "default" },
      });
    });
  });

  // ─── testConnection ───────────────────────────────────────────────────────

  describe("testConnection (SSRF protection)", () => {
    it("rejects non-HTTPS URLs", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl:
            "http://idp.example.com/.well-known/openid-configuration",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects localhost URLs", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl:
            "https://localhost:8080/.well-known/openid-configuration",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects .local hostnames", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await expect(
        caller.testConnection({
          discoveryUrl:
            "https://keycloak.local/.well-known/openid-configuration",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects private IP addresses after DNS resolution", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      mockDnsLookup.mockResolvedValue({ address: "192.168.1.100", family: 4 });

      const caller = ssoRouter.createCaller(makeCtx() as never);
      // This will throw because 192.168.1.100 is private
      await expect(
        caller.testConnection({
          discoveryUrl:
            "https://internal-idp.example.com/.well-known/openid-configuration",
        })
      ).rejects.toThrow(TRPCError);
    });
  });
});
