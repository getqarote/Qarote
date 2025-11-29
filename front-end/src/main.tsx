import "@/styles/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { initializeGA } from "@/lib/ga";
import { logger } from "@/lib/logger";
import { initSentry } from "@/lib/sentry";

import App from "./App.tsx";

// Initialize Sentry only if enabled
const enableSentry =
  import.meta.env.VITE_ENABLE_SENTRY === "true" ||
  import.meta.env.VITE_DEPLOYMENT_MODE !== "self-hosted";

if (enableSentry) {
  initSentry();
}

// Initialize GA only in cloud mode
const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "cloud";
if (deploymentMode === "cloud") {
  initializeGA();
}

// Get Google OAuth client ID from environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const enableOAuth =
  import.meta.env.VITE_ENABLE_OAUTH !== "false" &&
  (deploymentMode === "cloud" || import.meta.env.VITE_ENABLE_OAUTH === "true");

if (!googleClientId && enableOAuth) {
  logger.warn(
    "VITE_GOOGLE_CLIENT_ID environment variable is not set. Google OAuth will not work."
  );
}

const AppWrapper = () => {
  if (enableOAuth && googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    );
  }
  return <App />;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>
);
