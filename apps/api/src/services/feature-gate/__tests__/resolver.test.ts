/**
 * Resolver tests — verify the order (capability → license → plan), preview
 * semantics, and fallback population. Each axis is mocked at the module
 * boundary so the resolver is exercised in isolation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { FEATURES } from "@/config/features";

import { UserPlan } from "@/generated/prisma/client";

// ── Mocks for license / plan / cloud-mode / capability dependencies ─────────
const mockIsFeatureEnabled = vi.fn();
const mockGetOrgPlan = vi.fn();
const mockIsCloudMode = vi.fn();
const mockIsDemoMode = vi.fn();
const mockResolveCapabilityAxis = vi.fn();
const mockResolveLicenseAxis = vi.fn();

// After the boundary collapse, `resolveLicenseAxis` lives next to
// `isFeatureEnabled` in the same module. Stubbing only the inner
// binary check is not enough — when the real `resolveLicenseAxis`
// calls `isFeatureEnabled` inside the same module, the call resolves
// to the build-time local reference and bypasses the mock. Stub the
// composer wrapper directly instead; per-axis behaviour (license-
// required config, cloud fallthrough) has its own dedicated tests.
vi.mock("@/services/feature-gate/license", () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
  resolveLicenseAxis: mockResolveLicenseAxis,
}));

vi.mock("@/services/plan/plan.service", () => ({
  getOrgPlan: mockGetOrgPlan,
}));

vi.mock("@/config/deployment", () => ({
  isCloudMode: mockIsCloudMode,
  isDemoMode: mockIsDemoMode,
  // Required by `@/services/posthog` which the resolver imports for the
  // `gate_evaluated` event. Self-hosted instances skip telemetry.
  isSelfHostedMode: () => true,
}));

// Mock the capability axis so the resolver-composition tests stay focused
// on order/fallback. Capability rules themselves have their own test
// suite (see capability-axis.test.ts).
vi.mock("@/services/feature-gate/capability-axis", () => ({
  resolveCapabilityAxis: mockResolveCapabilityAxis,
}));

const { resolveFeatureGate } = await import("@/services/feature-gate");

beforeEach(() => {
  mockIsFeatureEnabled.mockReset();
  mockGetOrgPlan.mockReset();
  mockIsCloudMode.mockReset();
  mockIsDemoMode.mockReset();
  mockResolveCapabilityAxis.mockReset();
  mockResolveLicenseAxis.mockReset();
  // Default to self-hosted, no-license, free-plan — concrete blocks dominate
  // unless a test relaxes them. Capability + license axes default to "ok"
  // so the composition tests focus on plan ordering; tests that exercise
  // license behaviour override the mock locally.
  mockIsCloudMode.mockReturnValue(false);
  mockIsDemoMode.mockReturnValue(false);
  mockGetOrgPlan.mockResolvedValue(UserPlan.FREE);
  mockResolveCapabilityAxis.mockResolvedValue({ kind: "ok" });
  mockResolveLicenseAxis.mockResolvedValue({ kind: "ok" });
});

describe("resolveFeatureGate — license axis", () => {
  it("blocks with FORBIDDEN-style payload when license missing in self-hosted", async () => {
    mockResolveLicenseAxis.mockResolvedValue({
      kind: "blocked",
      blockedBy: "license",
      feature: FEATURES.SLACK_INTEGRATION,
      reasonKey: "license.featureRequiresLicense",
      upgrade: {
        ctaKey: "license.cta.activate",
        ctaUrl: "/settings/license",
      },
    });
    const result = await resolveFeatureGate(FEATURES.SLACK_INTEGRATION, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockedBy).toBe("license");
    expect(result.upgrade?.ctaUrl).toBe("/settings/license");
  });

  it("falls through to plan axis when in cloud mode", async () => {
    mockIsCloudMode.mockReturnValue(true);
    // In cloud the license axis returns ok unconditionally; plan axis
    // takes over and blocks SSO on FREE.
    mockResolveLicenseAxis.mockResolvedValue({ kind: "ok" });
    const result = await resolveFeatureGate(FEATURES.SSO, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockedBy).toBe("plan");
  });

  it("returns ok when license includes the feature", async () => {
    mockResolveLicenseAxis.mockResolvedValue({ kind: "ok" });
    mockGetOrgPlan.mockResolvedValue(UserPlan.ENTERPRISE);
    const result = await resolveFeatureGate(FEATURES.WEBHOOK_INTEGRATION, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("ok");
  });
});

describe("resolveFeatureGate — plan axis", () => {
  beforeEach(() => {
    // Pretend we always have license so plan axis is the gate.
    mockResolveLicenseAxis.mockResolvedValue({ kind: "ok" });
  });

  it("returns preview on FREE for preview-mode features", async () => {
    const result = await resolveFeatureGate(FEATURES.MESSAGE_TRACING, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("preview");
    if (result.kind !== "preview") return;
    expect(result.previewCount).toBeGreaterThan(0);
    expect(result.upgrade.ctaUrl).toBe("/plans");
  });

  it("returns blocked on FREE for block-mode features", async () => {
    const result = await resolveFeatureGate(FEATURES.SSO, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockedBy).toBe("plan");
    expect(result.upgrade?.targetPlan).toBe(UserPlan.DEVELOPER);
  });

  it("returns ok on paid plans for any plan-restricted feature", async () => {
    mockGetOrgPlan.mockResolvedValue(UserPlan.DEVELOPER);
    const result = await resolveFeatureGate(FEATURES.MESSAGE_TRACING, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("ok");
  });

  it("treats missing organizationId as FREE", async () => {
    const result = await resolveFeatureGate(FEATURES.MESSAGE_TRACING);
    expect(result.kind).toBe("preview");
    expect(mockGetOrgPlan).not.toHaveBeenCalled();
  });
});

describe("resolveFeatureGate — license-only feature (no plan restriction)", () => {
  it("license-required + paid-plan-bypass → ok", async () => {
    mockResolveLicenseAxis.mockResolvedValue({ kind: "ok" });
    mockGetOrgPlan.mockResolvedValue(UserPlan.ENTERPRISE);
    const result = await resolveFeatureGate(FEATURES.WORKSPACE_MANAGEMENT, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("ok");
  });
});

describe("resolveFeatureGate — order matters", () => {
  it("license block wins over plan-preview when both apply", async () => {
    // FREE plan + license missing on a preview feature: license wins because
    // capability → license → plan, and license is a hard block (cannot be
    // remediated by plan upgrade alone in self-hosted).
    mockResolveLicenseAxis.mockResolvedValue({
      kind: "blocked",
      blockedBy: "license",
      feature: FEATURES.MESSAGE_TRACING,
      reasonKey: "license.featureRequiresLicense",
    });
    const result = await resolveFeatureGate(FEATURES.MESSAGE_TRACING, {
      organizationId: "org_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockedBy).toBe("license");
  });
});

describe("resolveFeatureGate — capability axis composition", () => {
  it("capability block wins over license and plan (axis order)", async () => {
    // License is missing AND plan is FREE, but capability blocks first —
    // resolver must surface the capability block, not license/plan.
    mockResolveLicenseAxis.mockResolvedValue({
      kind: "blocked",
      blockedBy: "license",
      feature: FEATURES.MESSAGE_TRACING,
      reasonKey: "license.featureRequiresLicense",
    });
    mockResolveCapabilityAxis.mockResolvedValue({
      kind: "blocked",
      blockedBy: "capability",
      feature: FEATURES.MESSAGE_TRACING,
      reasonKey: "capability.tracing.pluginMissing",
    });
    const result = await resolveFeatureGate(FEATURES.MESSAGE_TRACING, {
      organizationId: "org_1",
      serverId: "srv_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.blockedBy).toBe("capability");
  });

  it("populates fallback when capability blocks and capabilityFallback is configured", async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);
    mockGetOrgPlan.mockResolvedValue(UserPlan.ENTERPRISE);
    // First call: tracing blocked. Second call (recursive check on the
    // fallback feature): spy is OK.
    mockResolveCapabilityAxis
      .mockResolvedValueOnce({
        kind: "blocked",
        blockedBy: "capability",
        feature: FEATURES.MESSAGE_TRACING,
        reasonKey: "capability.tracing.pluginMissing",
      })
      .mockResolvedValueOnce({ kind: "ok" });

    const result = await resolveFeatureGate(FEATURES.MESSAGE_TRACING, {
      organizationId: "org_1",
      serverId: "srv_1",
    });
    expect(result.kind).toBe("blocked");
    if (result.kind !== "blocked") return;
    expect(result.fallback?.feature).toBe(FEATURES.MESSAGE_SPY);
  });
});
