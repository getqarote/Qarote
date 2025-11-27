import { StrictMode } from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import { initializeGA } from "./lib/ga";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import logger from "./lib/logger";

initSentry();
initializeGA();

// Get Google OAuth client ID from environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  logger.warn(
    "VITE_GOOGLE_CLIENT_ID environment variable is not set. Google OAuth will not work."
  );
}

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const posthogEnabled = import.meta.env.VITE_POSTHOG_ENABLED === "true";

if (!posthogKey) {
  logger.warn(
    "VITE_PUBLIC_POSTHOG_KEY environment variable is not set. PostHog will not work."
  );
}

if (!posthogHost) {
  logger.warn(
    "VITE_PUBLIC_POSTHOG_HOST environment variable is not set. PostHog will not work."
  );
}

logger.debug("posthogKey", posthogKey);
logger.debug("posthogHost", posthogHost);
logger.debug("posthogEnabled", posthogEnabled);
logger.debug("MODE", import.meta.env.MODE);
logger.debug("production", import.meta.env.MODE === "production");
logger.debug("development", import.meta.env.MODE === "development");
logger.debug("test", import.meta.env.MODE === "test");
logger.debug("staging", import.meta.env.MODE === "staging");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
