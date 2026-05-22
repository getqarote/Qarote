/**
 * Typed PostHog wrapper for apps/portal. Routes all calls through
 * `@qarote/analytics` for compile-time safety on event names and properties.
 */
import {
  buildIdentifyPayload,
  type EventName,
  type EventProperties,
  type IdentifyUserInput,
} from "@qarote/analytics";
import posthog from "posthog-js";

const SUPER_PROPS = { app: "portal" as const };

export function track<E extends EventName>(
  event: E,
  properties?: EventProperties<E>
): void {
  posthog.capture(event, {
    ...SUPER_PROPS,
    ...((properties as Record<string, unknown> | undefined) ?? {}),
  });
}

export function identify(user: IdentifyUserInput): void {
  const payload = buildIdentifyPayload(user);
  posthog.identify(payload.distinctId, {
    $set: payload.$set,
    $set_once: payload.$set_once,
  });
}

export function resetIdentity(): void {
  posthog.reset();
}
