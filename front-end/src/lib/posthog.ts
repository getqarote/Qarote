import posthog from "posthog-js";
import { usePostHog } from "posthog-js/react";
import logger from "./logger";

/**
 * Hook to use PostHog in React components
 * This is the recommended way to access PostHog in React components
 *
 * @example
 * ```tsx
 * const posthog = usePostHog();
 * posthog.capture('button_clicked');
 * ```
 */
export { usePostHog };

/**
 * Identify a user in PostHog
 * Use this utility function when you need to identify users outside of React components
 * For React components, use the usePostHog hook instead
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
): void {
  try {
    if (typeof window !== "undefined" && typeof posthog !== "undefined") {
      posthog.identify(userId, properties);
      logger.debug("PostHog user identified", { userId, properties });
    }
  } catch (error) {
    logger.error("Failed to identify user in PostHog:", error, {
      userId,
      properties,
    });
  }
}

/**
 * Reset user identification (e.g., on logout)
 * Use this utility function when you need to reset users outside of React components
 * For React components, use the usePostHog hook instead
 */
export function resetPostHog(): void {
  try {
    if (typeof window !== "undefined" && typeof posthog !== "undefined") {
      posthog.reset();
      logger.debug("PostHog user reset");
    }
  } catch (error) {
    logger.error("Failed to reset PostHog:", error);
  }
}

/**
 * Track a custom event
 * Use this utility function when you need to track events outside of React components
 * For React components, use the usePostHog hook instead
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  try {
    if (typeof window !== "undefined" && typeof posthog !== "undefined") {
      posthog.capture(eventName, properties);
      logger.debug("PostHog event tracked", { eventName, properties });
    }
  } catch (error) {
    logger.error("Failed to track event in PostHog:", error, {
      eventName,
      properties,
    });
  }
}
