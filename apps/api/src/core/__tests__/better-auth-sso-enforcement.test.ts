import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// better-auth.ts instantiates the full betterAuth() graph at module load, so we
// stub every collaborator it touches. We only exercise isSsoEnforcedForEmail,
// which depends solely on prisma.orgSsoConfig + isCloudMode.

const mockOrgSsoConfigFindFirst = vi.fn();
vi.mock("@/core/prisma", () => ({
  prisma: {
    orgSsoConfig: {
      findFirst: (...a: unknown[]) => mockOrgSsoConfigFindFirst(...a),
    },
  },
}));

let mockIsCloudMode = false;
vi.mock("@/config/deployment", () => ({
  isCloudMode: () => mockIsCloudMode,
  isSelfHostedMode: () => !mockIsCloudMode,
}));

vi.mock("@/core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Keep betterAuth() construction cheap and side-effect free.
vi.mock("better-auth", () => ({ betterAuth: () => ({}) }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: () => ({}) }));
vi.mock("better-auth/api", () => ({
  createAuthMiddleware: (fn: unknown) => fn,
  APIError: class APIError extends Error {},
}));
vi.mock("@better-auth/api-key", () => ({ apiKey: () => ({}) }));
vi.mock("@better-auth/sso", () => ({ sso: () => ({}) }));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));

vi.mock("@/config", () => ({
  authConfig: { jwtSecret: "test" },
  config: { API_URL: "http://x", FRONTEND_URL: "http://x", CORS_ORIGIN: "" },
  emailConfig: { enabled: false },
  googleConfig: { enabled: false, clientId: "", clientSecret: "" },
}));

vi.mock("@/services/email/email-verification.service", () => ({
  EmailVerificationService: {},
}));
vi.mock("@/services/feature-gate", () => ({ getLicensePayload: vi.fn() }));
vi.mock("@/services/integrations/notion.service", () => ({
  notionService: { syncUser: vi.fn() },
}));
vi.mock("@/services/plan/plan.service", () => ({ getOrgPlan: vi.fn() }));
vi.mock("@/services/stripe/customer.service", () => ({
  StripeCustomerService: {},
}));

const { isSsoEnforcedForEmail } = await import("../better-auth");

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("isSsoEnforcedForEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCloudMode = false;
  });

  it("self-hosted: blocks when the instance config is enforced", async () => {
    mockOrgSsoConfigFindFirst.mockResolvedValue({
      provider: { providerId: "default" },
    });

    expect(await isSsoEnforcedForEmail("user@acme.com")).toBe(true);
    expect(mockOrgSsoConfigFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          enforced: true,
          organizationId: null,
        }),
      })
    );
  });

  it("self-hosted: allows when no enforced config exists", async () => {
    mockOrgSsoConfigFindFirst.mockResolvedValue(null);
    expect(await isSsoEnforcedForEmail("user@acme.com")).toBe(false);
  });

  it("cloud: matches by lowercased email domain", async () => {
    mockIsCloudMode = true;
    mockOrgSsoConfigFindFirst.mockResolvedValue({
      provider: { providerId: "org-1" },
    });

    expect(await isSsoEnforcedForEmail("Alice@ACME.com")).toBe(true);
    expect(mockOrgSsoConfigFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          enforced: true,
          provider: { domain: "acme.com" },
        }),
      })
    );
  });

  it("allows when the email has no @ (defers to normal validation)", async () => {
    expect(await isSsoEnforcedForEmail("garbage")).toBe(false);
    expect(mockOrgSsoConfigFindFirst).not.toHaveBeenCalled();
  });

  it("fails open (allows) when the lookup throws", async () => {
    mockOrgSsoConfigFindFirst.mockRejectedValue(new Error("db down"));
    expect(await isSsoEnforcedForEmail("user@acme.com")).toBe(false);
  });
});
