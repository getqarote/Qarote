import { PostHog } from "posthog-node";

export const posthog: PostHog | null = process.env.POSTHOG_API_KEY
  ? new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com",
      flushAt: 20,
      flushInterval: 10_000,
    })
  : null;
