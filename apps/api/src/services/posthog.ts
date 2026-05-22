import {
  buildIdentifyPayload,
  buildOrganizationGroup,
  type EventName,
  type EventProperties,
  type IdentifyUserInput,
  type OrganizationGroupTraits,
  type SuperProperties,
} from "@qarote/analytics";
import { PostHog } from "posthog-node";

import { posthogConfig } from "@/config";
import { isSelfHostedMode } from "@/config/deployment";

// Never send telemetry from self-hosted instances regardless of env vars
export const posthog =
  !isSelfHostedMode() && posthogConfig.apiKey
    ? new PostHog(posthogConfig.apiKey, {
        host: posthogConfig.host,
        flushAt: 20,
        flushInterval: 10_000,
      })
    : null;

/**
 * Identify a user with the standard `$set` / `$set_once` shape. Caller passes
 * already-loaded entities — this function NEVER fetches from the database.
 */
export function identifyUser(user: IdentifyUserInput): void {
  if (!posthog) return;
  const payload = buildIdentifyPayload(user);
  posthog.identify({
    distinctId: payload.distinctId,
    properties: {
      $set: payload.$set,
      $set_once: payload.$set_once,
    },
  });
}

interface CaptureContext {
  distinctId: string;
  superProperties?: SuperProperties;
  /**
   * Used as PostHog's `$insert_id` for native dedup (7-day window). Pass the
   * Stripe event ID for webhook-driven events.
   */
  insertId?: string;
}

/**
 * Type-safe event capture. Event name and properties are validated against
 * the shared `@qarote/analytics` registry.
 */
export function trackEvent<E extends EventName>(
  ctx: CaptureContext,
  event: E,
  properties: EventProperties<E>
): void {
  if (!posthog) return;
  const merged: Record<string, unknown> = {
    ...(ctx.superProperties ?? {}),
    ...(properties as Record<string, unknown>),
  };
  if (ctx.insertId) {
    merged.$insert_id = ctx.insertId;
  }
  posthog.capture({
    distinctId: ctx.distinctId,
    event,
    properties: merged,
  });
}

/**
 * Attach an organization group to subsequent events for a given user. Use this
 * to unlock org-level retention and MRR cohorts in PostHog.
 */
export function identifyOrganization(
  organizationId: string,
  traits: OrganizationGroupTraits
): void {
  if (!posthog) return;
  const group = buildOrganizationGroup(organizationId, traits);
  posthog.groupIdentify({
    groupType: group.groupType,
    groupKey: group.groupKey,
    properties: group.properties as Record<string, unknown>,
  });
}
