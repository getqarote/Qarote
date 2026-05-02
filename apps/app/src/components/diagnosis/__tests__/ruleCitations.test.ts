/**
 * Tests for the static rule -> citation URL map.
 *
 * The map mirrors the backend allowlist (apps/api/src/ee/services/
 * incident/citation-allowlist.ts). Drift here means the disclosure
 * link in `<DiagnosisCard>` either points nowhere (missing entry) or
 * to a 404 (typo). The completeness check pins every rule from the
 * `DiagnosisRuleType` union has an entry; the format check pins the
 * URL is an https://www.rabbitmq.com/* doc page (the only host on
 * the backend allowlist).
 */

import { describe, expect, it } from "vitest";

import type { DiagnosisRuleType } from "../DiagnosisRuleBadge";
import { formatCitationLabel, RULE_CITATIONS } from "../ruleCitations";

const ALL_RULES: DiagnosisRuleType[] = [
  "CONSUMER_CRASH",
  "SLOW_CONSUMER",
  "QUEUE_BACKLOG",
  "PRODUCER_SPIKE",
  "QUEUE_DRAIN_STALL",
  "NO_ACTIVITY",
  "MEMORY_ALARM_ACTIVE",
  "DISK_ALARM_ACTIVE",
  "PUBLISHER_FLOW_CONTROL",
  "CHANNEL_LEAK",
  "NO_CONSUMER_PERSISTENT_QUEUE",
  "QUEUE_NEAR_LENGTH_LIMIT",
  "DLX_FILLING",
  "CONSUMER_UTILIZATION_LOW",
  "QUORUM_LEADER_CHURN",
  "STREAM_NO_OFFSET_TRACKING",
  "CLASSIC_QUEUE_V1_LARGE",
];

describe("RULE_CITATIONS", () => {
  it("has an entry for every rule in DiagnosisRuleType", () => {
    for (const rule of ALL_RULES) {
      expect(RULE_CITATIONS[rule]).toBeDefined();
    }
  });

  it("every URL points to the rabbitmq.com docs host", () => {
    for (const rule of ALL_RULES) {
      const url = RULE_CITATIONS[rule];
      expect(url).toMatch(/^https:\/\/www\.rabbitmq\.com\/docs\//);
    }
  });

  it("has no extra entries beyond the rule union", () => {
    const mapKeys = Object.keys(RULE_CITATIONS).sort();
    const expected = [...ALL_RULES].sort();
    expect(mapKeys).toEqual(expected);
  });
});

describe("formatCitationLabel", () => {
  it("strips https://www. prefix", () => {
    expect(formatCitationLabel("https://www.rabbitmq.com/docs/queues")).toBe(
      "rabbitmq.com/docs/queues"
    );
  });

  it("strips https:// prefix when no www subdomain", () => {
    expect(formatCitationLabel("https://rabbitmq.com/docs/queues")).toBe(
      "rabbitmq.com/docs/queues"
    );
  });

  it("strips a trailing slash", () => {
    expect(formatCitationLabel("https://www.rabbitmq.com/docs/queues/")).toBe(
      "rabbitmq.com/docs/queues"
    );
  });
});
