import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/plan/plan.service", () => ({
  getWorkspacePlan: vi.fn(),
}));

import { getWorkspacePlan } from "@/services/plan/plan.service";

import { resolveAllowedRange } from "../resolve-allowed-range";

import { UserPlan } from "@/generated/prisma/client";

const mockGetWorkspacePlan = getWorkspacePlan as ReturnType<typeof vi.fn>;

// Uniform 30-day metrics retention (matches the TimescaleDB chunk-drop policy).
const PAID_MAX = 30 * 24; // 720h

describe("resolveAllowedRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Invalid input ────────────────────────────────────────────────────────

  it("requestedHours = 0 → throws", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
    await expect(resolveAllowedRange("ws-1", 0)).rejects.toThrow(
      "requestedHours must be positive"
    );
  });

  it("requestedHours < 0 → throws", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
    await expect(resolveAllowedRange("ws-1", -1)).rejects.toThrow(
      "requestedHours must be positive"
    );
  });

  // ── FREE plan — 6h preview cap ─────────────────────────────────────────────

  it("FREE + requested 6h → allowed 6h, wasClamped:false", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
    const result = await resolveAllowedRange("ws-1", 6);
    expect(result).toEqual({ hours: 6, wasClamped: false });
  });

  it("FREE + requested 3h → allowed 3h, wasClamped:false (within cap)", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
    const result = await resolveAllowedRange("ws-1", 3);
    expect(result).toEqual({ hours: 3, wasClamped: false });
  });

  it("FREE + requested 24h → clamped to 6h, wasClamped:true", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
    const result = await resolveAllowedRange("ws-1", 24);
    expect(result).toEqual({ hours: 6, wasClamped: true });
  });

  it("FREE + requested 720h → clamped to 6h, wasClamped:true", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.FREE);
    const result = await resolveAllowedRange("ws-1", 720);
    expect(result).toEqual({ hours: 6, wasClamped: true });
  });

  // ── DEVELOPER plan — uniform 30-day window ──────────────────────────────────

  it("DEVELOPER + requested 72h → allowed 72h, wasClamped:false", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.DEVELOPER);
    const result = await resolveAllowedRange("ws-1", 72);
    expect(result).toEqual({ hours: 72, wasClamped: false });
  });

  it("DEVELOPER + requested 720h → allowed 720h, wasClamped:false (at limit)", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.DEVELOPER);
    const result = await resolveAllowedRange("ws-1", PAID_MAX);
    expect(result).toEqual({ hours: PAID_MAX, wasClamped: false });
  });

  it("DEVELOPER + requested 721h → clamped to 720h, wasClamped:true", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.DEVELOPER);
    const result = await resolveAllowedRange("ws-1", PAID_MAX + 1);
    expect(result).toEqual({ hours: PAID_MAX, wasClamped: true });
  });

  // ── ENTERPRISE plan — same uniform 30-day window ────────────────────────────

  it("ENTERPRISE + requested 720h → allowed 720h, wasClamped:false", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.ENTERPRISE);
    const result = await resolveAllowedRange("ws-1", PAID_MAX);
    expect(result).toEqual({ hours: PAID_MAX, wasClamped: false });
  });

  it("ENTERPRISE + requested 721h → clamped to 720h, wasClamped:true", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.ENTERPRISE);
    const result = await resolveAllowedRange("ws-1", PAID_MAX + 1);
    expect(result).toEqual({ hours: PAID_MAX, wasClamped: true });
  });

  it("ENTERPRISE + requested 168h → allowed 168h, wasClamped:false (within limit)", async () => {
    mockGetWorkspacePlan.mockResolvedValue(UserPlan.ENTERPRISE);
    const result = await resolveAllowedRange("ws-1", 168);
    expect(result).toEqual({ hours: 168, wasClamped: false });
  });
});
