import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureMock = vi.fn();
const identifyMock = vi.fn();
const groupIdentifyMock = vi.fn();
const shutdownMock = vi.fn();

vi.mock("posthog-node", () => {
  return {
    PostHog: class {
      capture = captureMock;
      identify = identifyMock;
      groupIdentify = groupIdentifyMock;
      shutdown = shutdownMock;
    },
  };
});

vi.mock("@/config", () => ({
  posthogConfig: { apiKey: "phc_test", host: "https://eu.i.posthog.com" },
}));

vi.mock("@/config/deployment", () => ({
  isSelfHostedMode: () => false,
}));

describe("backend posthog wrapper", () => {
  beforeEach(() => {
    captureMock.mockClear();
    identifyMock.mockClear();
    groupIdentifyMock.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("identifyUser splits traits into $set and $set_once", async () => {
    const mod = await import("../posthog");
    mod.identifyUser({
      id: "u1",
      email: "a@b.io",
      planTier: "developer",
      isTrial: true,
      signupReferralSource: "twitter",
      initialUtmCampaign: "spring-launch",
    });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    const call = identifyMock.mock.calls[0]![0];
    expect(call.distinctId).toBe("u1");
    expect(call.properties.$set).toMatchObject({
      email: "a@b.io",
      plan_tier: "developer",
      is_trial: true,
    });
    expect(call.properties.$set_once).toMatchObject({
      signup_referral_source: "twitter",
      initial_utm_campaign: "spring-launch",
    });
  });

  it("trackEvent merges super-properties with event properties and adds $insert_id", async () => {
    const mod = await import("../posthog");
    mod.trackEvent(
      {
        distinctId: "u1",
        superProperties: { app: "api", workspace_id: "ws_1" },
        insertId: "evt_stripe_123",
      },
      "subscription_purchased",
      {
        plan: "ENTERPRISE",
        billing_interval: "monthly",
        is_trial: false,
        organization_id: "org_1",
        stripe_subscription_id: "sub_xx",
      }
    );

    expect(captureMock).toHaveBeenCalledTimes(1);
    const call = captureMock.mock.calls[0]![0];
    expect(call.event).toBe("subscription_purchased");
    expect(call.distinctId).toBe("u1");
    expect(call.properties).toMatchObject({
      app: "api",
      workspace_id: "ws_1",
      plan: "ENTERPRISE",
      $insert_id: "evt_stripe_123",
    });
  });

  it("trackEvent omits $insert_id when not provided", async () => {
    const mod = await import("../posthog");
    mod.trackEvent(
      { distinctId: "u1", superProperties: { app: "api" } },
      "user_signed_in",
      { method: "password" }
    );

    expect(captureMock).toHaveBeenCalledTimes(1);
    const props = captureMock.mock.calls[0]![0].properties;
    expect(props).not.toHaveProperty("$insert_id");
    expect(props.method).toBe("password");
  });

  it("identifyOrganization writes a groupIdentify call", async () => {
    const mod = await import("../posthog");
    mod.identifyOrganization("org_1", {
      plan_tier: "enterprise",
      seat_count: 5,
    });
    expect(groupIdentifyMock).toHaveBeenCalledWith({
      groupType: "organization",
      groupKey: "org_1",
      properties: { plan_tier: "enterprise", seat_count: 5 },
    });
  });
});
