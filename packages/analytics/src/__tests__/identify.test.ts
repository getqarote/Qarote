import { describe, expect, it } from "vitest";

import {
  buildIdentifyPayload,
  buildOrganizationGroup,
  buildSuperProperties,
  deriveAcquisitionChannel,
} from "../identify";

describe("buildIdentifyPayload", () => {
  it("places mutable traits in $set and first-touch in $set_once", () => {
    const payload = buildIdentifyPayload({
      id: "user_1",
      email: "a@b.io",
      planTier: "developer",
      isTrial: true,
      signupReferralSource: "twitter",
      signupAt: new Date("2026-01-01T00:00:00Z"),
      initialUtmSource: "twitter",
    });

    expect(payload.distinctId).toBe("user_1");
    expect(payload.$set).toEqual({
      email: "a@b.io",
      plan_tier: "developer",
      is_trial: true,
    });
    expect(payload.$set_once).toEqual({
      signup_referral_source: "twitter",
      signup_at: "2026-01-01T00:00:00.000Z",
      initial_utm_source: "twitter",
    });
  });

  it("omits null and undefined values from both buckets", () => {
    const payload = buildIdentifyPayload({
      id: "user_1",
      email: "a@b.io",
      planTier: "free",
      signupReferralSource: null,
      signupDiscoveryQuery: undefined,
    });

    expect(payload.$set).not.toHaveProperty("is_trial");
    expect(payload.$set_once).not.toHaveProperty("signup_referral_source");
    expect(payload.$set_once).not.toHaveProperty("signup_discovery_query");
  });
});

describe("buildSuperProperties", () => {
  it("emits standard super-properties for slicing", () => {
    const props = buildSuperProperties({
      planTier: "enterprise",
      isTrial: false,
      workspaceId: "ws_1",
      organizationId: "org_1",
      app: "api",
    });

    expect(props).toEqual({
      app: "api",
      plan_tier: "enterprise",
      workspace_id: "ws_1",
      organization_id: "org_1",
      is_trial: false,
    });
  });

  it("omits absent fields", () => {
    const props = buildSuperProperties({ planTier: "free" });
    expect(props).toEqual({ plan_tier: "free" });
  });
});

describe("buildOrganizationGroup", () => {
  it("produces a posthog groupIdentify-shaped payload", () => {
    const group = buildOrganizationGroup("org_1", {
      plan_tier: "developer",
      seat_count: 3,
    });
    expect(group).toEqual({
      groupKey: "org_1",
      groupType: "organization",
      properties: { plan_tier: "developer", seat_count: 3 },
    });
  });
});

describe("deriveAcquisitionChannel", () => {
  it.each([
    [{ utmMedium: "cpc" }, "paid"],
    [{ utmMedium: "paid-social" }, "paid"],
    [{ utmMedium: "organic" }, "organic"],
    [{ utmSource: "google" }, "organic"],
    [{ utmMedium: "referral" }, "referral"],
    [{ referrer: "https://news.ycombinator.com" }, "referral"],
    [{}, "direct"],
  ])("classifies %o as %s", (input, expected) => {
    expect(deriveAcquisitionChannel(input)).toBe(expected);
  });
});
