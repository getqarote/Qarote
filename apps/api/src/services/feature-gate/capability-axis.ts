/**
 * Capability axis of the feature gate.
 *
 * Reads the persisted `CapabilitySnapshot` from `RabbitMQServer` (with
 * support-override merged on top) and applies per-feature rules:
 *
 *   - `message_tracing` blocked when no firehose plugin is enabled. The
 *     ADR-002 fallback to `message_spy` (Live tap) is wired in
 *     `gate.config.ts:capabilityFallback` and attached by the composer.
 *   - `message_spy` blocked when the targeted queue is a stream — streams
 *     use offset-based consumption, the spy mechanism (binding mirror onto
 *     an exclusive queue) doesn't apply.
 *   - `incident_diagnosis` degraded when fewer than 3 hours of metric
 *     snapshots exist for the broker.
 *   - All features blocked when `caps === null` AND the server exists —
 *     we cannot affirm a feature works on a broker we haven't profiled.
 *
 * The capability axis returns `degraded` for hints (feature still
 * available, but with a caveat); the composer treats `degraded` as
 * `ok` for routing and surfaces the hint via a separate channel.
 *
 * Names: this file emits keys against the current `PremiumFeature`
 * enum (`message_tracing`, `message_spy`). When the messages-unified-ux
 * plan renames them, the rename PR is responsible for re-issuing JWT
 * licenses that list the old keys (see `gate.config.ts` header).
 */

import { logger } from "@/core/logger";
import { prisma } from "@/core/prisma";

import { FEATURES } from "@/config/features";

import type { CapabilitySnapshot } from "./capability-snapshot";
import { getServerCapabilities } from "./capability-snapshot";
import { getFeatureGateConfig } from "./gate.config";
import type { FeatureGateResult, FeatureKey, GateContext } from "./types";

/**
 * Minutes a broker must have been collecting `QueueMetricSnapshot`
 * rows before diagnosis findings carry signal. Below this threshold
 * the rules engine still runs but most rules can't fire (windowed
 * comparisons need at least one prior bucket); the UI surfaces a
 * "warming up" advisory so operators don't read "no findings" as
 * "broker is healthy". Three hours mirrors the existing diagnosis
 * window options (30m–8h) — anything shorter and the ratio of empty
 * to populated windows would itself swamp the rules.
 */
const DIAGNOSIS_WARMUP_MINUTES = 180;

/**
 * Resolve the capability axis for `feature`.
 *
 * Returns `kind: "ok"` for features without a capability rule, for
 * features whose rules pass, and for `degraded` results (the composer
 * does not treat hints as blocks).
 */
export async function resolveCapabilityAxis(
  feature: FeatureKey,
  context?: GateContext
): Promise<FeatureGateResult> {
  // Features that don't declare a capability dependency are always ok on
  // this axis — alerting/SSO/data export shouldn't block when a broker's
  // first-time detection hasn't run yet. See `gate.config.ts:capabilityRequired`.
  const config = getFeatureGateConfig(feature);
  if (!config.capabilityRequired) return { kind: "ok" };

  // Capability-required features without a server context can't be
  // evaluated. We fail open here (axis returns ok); the composer's
  // license/plan axes still run. Server-scoped procedures should pass
  // serverId — this branch is mainly for proactive `featureGate.evaluate`
  // calls without a server.
  if (!context?.serverId) return { kind: "ok" };

  const caps = await safelyLoadCapabilities(context.serverId);

  // Snapshot missing entirely → block conservatively. The frontend
  // renders "Cannot verify compatibility" with a Re-check CTA. Only the
  // feature is blocked, not unrelated features (we only get here when
  // capabilityRequired === true).
  if (caps === null) {
    return blocked(feature, "capability.unknown", {
      ctaKey: "capability.recheck",
      docsUrl: "/docs/features/compatibility",
    });
  }

  switch (feature) {
    case FEATURES.MESSAGE_TRACING:
      if (!caps.hasFirehoseExchange) {
        return blocked(
          feature,
          "capability.tracing.pluginMissing",
          {
            ctaKey: "capability.tracing.enablePlugin",
            docsUrl: "/docs/features/tracing#enabling-firehose",
            commands: ["rabbitmq-plugins enable rabbitmq_tracing"],
          },
          // `broker` is a reserved interpolation slot for future i18n copy
          // that names the specific broker; empty string until copy is added.
          { broker: "" }
        );
      }
      return { kind: "ok" };

    case FEATURES.MESSAGE_SPY: {
      // Per-queue rule: streams use offset-based consumption and can't
      // be tapped via binding mirror. Other queue types (and the
      // no-subject case — UI not targeting a specific queue) pass.
      if (
        context.subject?.kind === "queue" &&
        context.subject.queueType === "stream"
      ) {
        return blocked(feature, "capability.tap.streamUnsupported", {
          ctaKey: "capability.tap.useRecorderForStreams",
          docsUrl: "/docs/features/streams",
        });
      }
      return { kind: "ok" };
    }

    case FEATURES.INCIDENT_DIAGNOSIS: {
      // Diagnosis is "warm" once the broker has been collecting
      // metrics long enough for windowed rules (e.g. 30-min backlog
      // growth) to actually trigger. We test for the existence of a
      // snapshot OLDER than the warmup threshold rather than counting
      // — the index `(serverId, timestamp)` makes it a single
      // bounded lookup, and the literal count adds no value (one row
      // is enough to prove data was collected).
      const isWarm = await isDiagnosisWarm(context.serverId);
      if (!isWarm) {
        return {
          kind: "degraded",
          feature,
          reasonKey: "capability.diagnosis.warmingUp",
          reasonParams: { requiredMinutes: DIAGNOSIS_WARMUP_MINUTES },
        };
      }
      return { kind: "ok" };
    }

    default:
      return { kind: "ok" };
  }
}

/**
 * Whether the broker has at least one metric snapshot older than
 * `DIAGNOSIS_WARMUP_MINUTES`. We could `count()` to check density,
 * but presence of any old-enough snapshot is a sufficient proxy for
 * "data has been collecting long enough" — and presence-or-not is
 * cheaper than a full count under the same index.
 *
 * On query error we fail OPEN: returning `true` keeps the feature
 * available rather than locking it behind a transient DB blip. The
 * worst case is a missing warmup banner during an incident, not a
 * blocked diagnosis page.
 */
async function isDiagnosisWarm(serverId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - DIAGNOSIS_WARMUP_MINUTES * 60 * 1000);
  try {
    const oldest = await prisma.queueMetricSnapshot.findFirst({
      where: { serverId, timestamp: { lte: cutoff } },
      select: { id: true },
    });
    return oldest !== null;
  } catch (error) {
    logger.error(
      { error, serverId },
      "capability-axis: warmup check failed — failing open"
    );
    return true;
  }
}

async function safelyLoadCapabilities(
  serverId: string
): Promise<CapabilitySnapshot | null> {
  try {
    return await getServerCapabilities(serverId);
  } catch (error) {
    logger.error(
      { error, serverId },
      "capability-axis: failed to load snapshot — treating as unknown"
    );
    return null;
  }
}

function blocked(
  feature: FeatureKey,
  reasonKey: string,
  remediation: { ctaKey: string; docsUrl: string; commands?: string[] },
  reasonParams?: Record<string, string | number>
): FeatureGateResult {
  return {
    kind: "blocked",
    blockedBy: "capability",
    feature,
    reasonKey,
    ...(reasonParams ? { reasonParams } : {}),
    remediation: {
      ctaKey: remediation.ctaKey,
      docsUrl: remediation.docsUrl,
      ...(remediation.commands ? { commands: remediation.commands } : {}),
    },
  };
}
