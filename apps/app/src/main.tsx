import "@/styles/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/i18n";
import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";
import posthog from "posthog-js";

import { initializeGA } from "@/lib/ga";
import { initSentry } from "@/lib/sentry";

import App from "./App.tsx";

// Initialize Sentry only when explicitly enabled or in cloud mode
const enableSentry =
  import.meta.env.VITE_ENABLE_SENTRY === "true" ||
  import.meta.env.VITE_DEPLOYMENT_MODE === "cloud";

if (enableSentry) {
  initSentry();
}

// Initialize GA only when explicitly in cloud mode (undefined = selfhosted)
const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "selfhosted";
if (deploymentMode === "cloud") {
  initializeGA();
}

// Initialize PostHog when token is configured.
// Phase 1 of cookie-consent rollout: opt-out by default, no session replay,
// no autocapture, no /decide call, no persistence. Phase 2 will add an
// in-app privacy toggle that opts users in after explicit consent.
if (import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    autocapture: false,
    persistence: "memory",
    advanced_disable_decide: true,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <App />
      </PostHogErrorBoundary>
    </PostHogProvider>
  </StrictMode>
);
