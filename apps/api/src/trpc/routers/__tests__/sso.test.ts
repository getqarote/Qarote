import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockOrganizationMemberFindFirst = vi.fn();
const mockOrganizationMemberFindUnique = vi.fn();
const mockWorkspaceFindUnique = vi.fn();
const mockOrgSsoConfigFindFirst = vi.fn();
const mockSsoProviderFindUnique = vi.fn();
const mockSsoProviderUpsert = vi.fn();
const mockSsoProviderUpdate = vi.fn();
const mockSsoProviderDeleteMany = vi.fn();
const mockOrgSsoConfigUpsert = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/core/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: (...a: unknown[]) => mockWorkspaceFindUnique(...a),
    },
    organizationMember: {
      findFirst: (...a: unknown[]) => mockOrganizationMemberFindFirst(...a),
      findUnique: (...a: unknown[]) => mockOrganizationMemberFindUnique(...a),
    },
    ssoProvider: {
      findUnique: (...a: unknown[]) => mockSsoProviderFindUnique(...a),
      upsert: (...a: unknown[]) => mockSsoProviderUpsert(...a),
      update: (...a: unknown[]) => mockSsoProviderUpdate(...a),
      deleteMany: (...a: unknown[]) => mockSsoProviderDeleteMany(...a),
    },
    orgSsoConfig: {
      findFirst: (...a: unknown[]) => mockOrgSsoConfigFindFirst(...a),
      upsert: (...a: unknown[]) => mockOrgSsoConfigUpsert(...a),
    },
    $transaction: (...a: unknown[]) => mockTransaction(...a),
  },
}));

let mockIsCloudMode = false;
vi.mock("@/config/deployment", () => ({
  isCloudMode: () => mockIsCloudMode,
  isSelfHostedMode: () => !mockIsCloudMode,
}));

const mockGetOrgPlan = vi.fn();
vi.mock("@/services/plan/plan.service", () => ({
  getOrgPlan: (...a: unknown[]) => mockGetOrgPlan(...a),
  getUserPlan: vi.fn(),
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
      workspace: {
        findUnique: mockWorkspaceFindUnique,
      },
      organizationMember: {
        findFirst: mockOrganizationMemberFindFirst,
        findUnique: mockOrganizationMemberFindUnique,
      },
      ssoProvider: {
        findUnique: mockSsoProviderFindUnique,
        upsert: mockSsoProviderUpsert,
        update: mockSsoProviderUpdate,
        deleteMany: mockSsoProviderDeleteMany,
      },
      orgSsoConfig: {
        findFirst: mockOrgSsoConfigFindFirst,
        upsert: mockOrgSsoConfigUpsert,
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
  issuer: "https://idp.example.com",
  discoveryEndpoint: "https://idp.example.com/.well-known/openid-configuration",
  clientId: "qarote",
  clientSecret: "super-secret",
  pkce: false,
});

const mockProvider = {
  id: "prov-1",
  providerId: "default",
  issuer: "https://idp.example.com",
  domain: "",
  oidcConfig: oidcConfigJson,
  samlConfig: null,
  domainVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOrgConfig = {
  id: "osc-1",
  organizationId: null,
  providerId: "prov-1",
  autoProvision: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  provider: mockProvider,
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
    it("self-hosted: returns provider info when configured", async () => {
      mockOrgSsoConfigFindFirst.mockResolvedValue(mockOrgConfig);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getConfig();

      expect(result).toMatchObject({
        enabled: true,
        cloudSso: false,
        buttonLabel: "Sign in with SSO",
        providerId: "default", // returns SsoProvider.providerId (logical ID), not OrgSsoConfig.providerId (FK)
        type: "oidc",
      });
    });

    it("self-hosted: returns null when not configured", async () => {
      mockOrgSsoConfigFindFirst.mockResolvedValue(null);

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
      mockOrgSsoConfigFindFirst.mockResolvedValue(mockOrgConfig);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getProviderConfig();

      expect(result).toBeDefined();
      expect(result!.type).toBe("oidc");
      expect(result!.oidcConfig?.clientSecret).toBe(REDACTED);
      expect(result!.oidcConfig?.clientId).toBe("qarote");
    });

    it("returns null when no provider configured", async () => {
      mockOrgSsoConfigFindFirst.mockResolvedValue(null);

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getProviderConfig();

      expect(result).toBeNull();
    });

    it("cloud: looks up by org membership", async () => {
      mockIsCloudMode = true;
      // resolveOrgAdmin now uses workspace.findUnique + organizationMember.findUnique
      mockWorkspaceFindUnique.mockResolvedValue({ organizationId: "org-1" });
      mockOrganizationMemberFindUnique.mockResolvedValue({
        organizationId: "org-1",
        role: "OWNER",
      });
      mockOrgSsoConfigFindFirst.mockResolvedValue({
        ...mockOrgConfig,
        organizationId: "org-1",
        provider: { ...mockProvider, providerId: "org-org-1" },
      });

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.getProviderConfig();

      expect(result?.providerId).toBe("org-org-1");
    });
  });

  // ─── registerProvider ─────────────────────────────────────────────────────

  describe("registerProvider (ssoAdmin)", () => {
    it("self-hosted: rejects if enterprise license not present", async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { upsert: vi.fn() },
          orgSsoConfig: { upsert: vi.fn() },
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

      const txSsoUpsert = vi.fn().mockResolvedValue({ id: "prov-new" });
      const txOscUpsert = vi.fn().mockResolvedValue({});
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { upsert: txSsoUpsert },
          orgSsoConfig: { upsert: txOscUpsert },
        })
      );

      const caller = ssoRouter.createCaller(makeCtx() as never);
      const result = await caller.registerProvider({
        type: "oidc",
        oidcDiscoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
        oidcClientId: "qarote",
        oidcClientSecret: "secret",
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
      expect(txOscUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            organizationId: null,
            providerId: "prov-new",
            autoProvision: true,
          }),
        })
      );
    });

    it("cloud: rejects non-enterprise plan", async () => {
      mockIsCloudMode = true;
      const { UserPlan } = await import("@/generated/prisma/client");
      // resolveOrgAdmin uses workspace + org member findUnique
      mockWorkspaceFindUnique.mockResolvedValue({ organizationId: "org-1" });
      mockOrganizationMemberFindUnique.mockResolvedValue({
        organizationId: "org-1",
        role: "OWNER",
      });
      mockGetOrgPlan.mockResolvedValue(UserPlan.DEVELOPER);

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
          orgSsoConfig: { upsert: vi.fn() },
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
      mockSsoProviderUpdate.mockResolvedValue({});

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await caller.updateProvider({
        type: "oidc",
        oidcDiscoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
        oidcClientId: "qarote",
        oidcClientSecret: REDACTED, // send redacted
      });

      const updateCall = mockSsoProviderUpdate.mock.calls[0][0];
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

  // ─── registerProvider issuer normalization ────────────────────────────────

  describe("registerProvider issuer normalization", () => {
    it("strips .well-known/openid-configuration from OIDC discovery URL", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);

      const txSsoUpsert = vi.fn().mockResolvedValue({ id: "prov-new" });
      const txOscUpsert = vi.fn().mockResolvedValue({});
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { upsert: txSsoUpsert },
          orgSsoConfig: { upsert: txOscUpsert },
        })
      );

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await caller.registerProvider({
        type: "oidc",
        oidcDiscoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
        oidcClientId: "qarote",
        oidcClientSecret: "secret",
      });

      const upsertCall = txSsoUpsert.mock.calls[0][0];
      expect(upsertCall.create.issuer).toBe("https://idp.example.com");
    });

    it("preserves issuer when discovery URL has no .well-known suffix", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);

      const txSsoUpsert = vi.fn().mockResolvedValue({ id: "prov-new" });
      const txOscUpsert = vi.fn().mockResolvedValue({});
      mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb({
          ssoProvider: { upsert: txSsoUpsert },
          orgSsoConfig: { upsert: txOscUpsert },
        })
      );

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await caller.registerProvider({
        type: "oidc",
        oidcDiscoveryUrl: "https://idp.example.com",
        oidcClientId: "qarote",
        oidcClientSecret: "secret",
      });

      const upsertCall = txSsoUpsert.mock.calls[0][0];
      expect(upsertCall.create.issuer).toBe("https://idp.example.com");
    });

    it("strips suffix in updateProvider too", async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      mockSsoProviderFindUnique.mockResolvedValue(mockProvider);
      mockSsoProviderUpdate.mockResolvedValue({});

      const caller = ssoRouter.createCaller(makeCtx() as never);
      await caller.updateProvider({
        type: "oidc",
        oidcDiscoveryUrl:
          "https://idp.example.com/.well-known/openid-configuration",
        oidcClientId: "qarote",
        oidcClientSecret: "new-secret",
      });

      const updateCall = mockSsoProviderUpdate.mock.calls[0][0];
      expect(updateCall.data.issuer).toBe("https://idp.example.com");
    });
  });
});
