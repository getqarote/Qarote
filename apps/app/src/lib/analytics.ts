/**
 * Typed PostHog wrapper for apps/app. Routes all calls through `@qarote/analytics`
 * for compile-time safety on event names and properties.
 *
 * The actual posthog-js client is initialized in `main.tsx` and accessed via
 * `posthog-js`'s default export. This module is intentionally thin.
 */
import {
  buildIdentifyPayload,
  type EventName,
  type EventProperties,
  type IdentifyUserInput,
  type PlanTier,
} from "@qarote/analytics";
import posthog from "posthog-js";

type SuperProperties = {
  app: "app";
  plan_tier?: PlanTier;
  workspace_id?: string;
  is_trial?: boolean;
};

let superProps: SuperProperties = { app: "app" };

export function setSuperProperties(props: Omit<SuperProperties, "app">): void {
  superProps = { app: "app", ...props };
}

export function track<E extends EventName>(
  event: E,
  properties?: EventProperties<E>
): void {
  const merged = {
    ...superProps,
    ...(properties ?? {}),
  };
  posthog.capture(event, merged as Record<string, unknown>);
}

export function identify(user: IdentifyUserInput): void {
  const payload = buildIdentifyPayload(user);
  posthog.identify(payload.distinctId, {
    $set: payload.$set,
    $set_once: payload.$set_once,
  });
}

export function setWorkspaceGroup(workspaceId: string): void {
  posthog.group("workspace", workspaceId);
}

export function resetIdentity(): void {
  posthog.reset();
  superProps = { app: "app" };
}
