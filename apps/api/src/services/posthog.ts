import { PostHog } from "posthog-node";

const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST;

export const posthog =
  apiKey && host
    ? new PostHog(apiKey, {
        host,
        enableExceptionAutocapture: true,
      })
    : null;
