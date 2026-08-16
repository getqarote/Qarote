import "@/styles/index.css";
// Self-hosted fonts (zero external request). Heading: Space Grotesk; UI body:
// IBM Plex Sans; numeric/mono: IBM Plex Mono. Weights 400–700 cover regular,
// medium, semibold (title-section) and bold (title-page).
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/i18n";
import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";
import posthog from "posthog-js";

import { initializeGA } from "@/lib/ga";
import { getDeploymentMode } from "@/lib/runtimeConfig";
import { initSentry } from "@/lib/sentry";

import App from "./App.tsx";

const deploymentMode = getDeploymentMode();

// Initialize Sentry only when explicitly enabled or in cloud mode
const enableSentry =
  import.meta.env.VITE_ENABLE_SENTRY === "true" || deploymentMode === "cloud";

if (enableSentry) {
  initSentry();
}

// Initialize GA only when explicitly in cloud mode
if (deploymentMode === "cloud") {
  initializeGA();
}

// Initialize PostHog only in cloud mode AND when a token is configured.
// Self-hosted deployments must NEVER send telemetry — mirrors the GA gate
// above. Defense in depth: the wrapper is opt-out by default and uses
// memory-only persistence, so an accidental token leak still wouldn't ship
// data, but the deployment-mode gate is the primary control.
//
// Phase 1 of cookie-consent rollout: opt-out by default, no session replay,
// no autocapture, no /decide call, no persistence. Phase 2 will add an
// in-app privacy toggle that opts users in after explicit consent.
if (
  deploymentMode === "cloud" &&
  import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
) {
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
