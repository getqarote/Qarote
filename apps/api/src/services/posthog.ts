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
