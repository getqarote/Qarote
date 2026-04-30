export function track(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  window.posthog?.capture(event, properties);
}
