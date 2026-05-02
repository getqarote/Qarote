/**
 * Invariant tests on FEATURE_GATE_CONFIG.
 *
 * The TS type `Record<FeatureKey, FeatureGateConfig>` already enforces
 * completeness at compile time — these are runtime guards against
 * accidental holes from a partial migration (e.g. someone removes an entry
 * during a rename and the old type signature lingers).
 */

import { describe, expect, it } from "vitest";

import {
  FEATURE_GATE_CONFIG,
  getBadgeTrackedFeatures,
  getFeatureGateConfig,
  isFeatureReadyOnSnapshot,
} from "@/services/feature-gate";

import { FEATURES, getAllPremiumFeatures } from "@/config/features";

describe("FEATURE_GATE_CONFIG", () => {
  it("has an entry for every PremiumFeature", () => {
    const featureKeys = getAllPremiumFeatures().sort();
    const configKeys = Object.keys(FEATURE_GATE_CONFIG).sort();
    expect(configKeys).toEqual(featureKeys);
  });

  it("getFeatureGateConfig throws on an unknown feature", () => {
    expect(() => getFeatureGateConfig("not_a_real_feature" as never)).toThrow(
      /No gate configuration/
    );
  });

  it("MESSAGE_TRACING declares MESSAGE_SPY as its capability fallback", () => {
    // Wired now so the messages-unified-ux plan finds it ready.
    expect(
      FEATURE_GATE_CONFIG[FEATURES.MESSAGE_TRACING].capabilityFallback
    ).toBe(FEATURES.MESSAGE_SPY);
  });

  it("every capabilityFallback points to a feature that exists in the config", () => {
    for (const [key, cfg] of Object.entries(FEATURE_GATE_CONFIG)) {
      if (!cfg.capabilityFallback) continue;
      expect(
        FEATURE_GATE_CONFIG[cfg.capabilityFallback],
        `Feature "${key}" declares capabilityFallback="${cfg.capabilityFallback}" which is not in FEATURE_GATE_CONFIG`
      ).toBeDefined();
    }
  });
});

describe("badge readiness predicates", () => {
  it("getBadgeTrackedFeatures returns features with badgeReadiness in FEATURES order", () => {
    const tracked = getBadgeTrackedFeatures();
    // Order MUST come from FEATURES (not Object.keys) so the popover
    // list reads predictably. Today: message_tracing precedes
    // message_spy in `config/features.ts` declaration order.
    expect(tracked).toEqual([FEATURES.MESSAGE_TRACING, FEATURES.MESSAGE_SPY]);
    for (const feature of tracked) {
      expect(FEATURE_GATE_CONFIG[feature].badgeReadiness).toBeDefined();
    }
  });

  it("isFeatureReadyOnSnapshot throws on untracked features (callers must filter first)", () => {
    expect(() =>
      isFeatureReadyOnSnapshot(FEATURES.ALERTING, { hasFirehoseExchange: true })
    ).toThrow(/badgeReadiness/);
  });

  it("returns false for tracked features when snapshot is null", () => {
    expect(isFeatureReadyOnSnapshot(FEATURES.MESSAGE_TRACING, null)).toBe(
      false
    );
    expect(isFeatureReadyOnSnapshot(FEATURES.MESSAGE_SPY, null)).toBe(false);
  });

  it("firehose-plugin readiness reflects hasFirehoseExchange", () => {
    expect(
      isFeatureReadyOnSnapshot(FEATURES.MESSAGE_TRACING, {
        hasFirehoseExchange: true,
      })
    ).toBe(true);
    expect(
      isFeatureReadyOnSnapshot(FEATURES.MESSAGE_TRACING, {
        hasFirehoseExchange: false,
      })
    ).toBe(false);
  });

  it("snapshot-present readiness ignores firehose, always true with a snapshot", () => {
    expect(
      isFeatureReadyOnSnapshot(FEATURES.MESSAGE_SPY, {
        hasFirehoseExchange: false,
      })
    ).toBe(true);
  });

  it("invariant: badgeReadiness implies capabilityRequired", () => {
    // Badging a feature that doesn't go through capability evaluation
    // would surface "ready" without ever asking the axis. Catch
    // misconfiguration at test time.
    for (const feature of getBadgeTrackedFeatures()) {
      expect(
        FEATURE_GATE_CONFIG[feature].capabilityRequired,
        `Feature "${feature}" has badgeReadiness but capabilityRequired is not true`
      ).toBe(true);
    }
  });
});
