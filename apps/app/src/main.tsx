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
  (import.meta.env.VITE_DEPLOYMENT_MODE !== "community" &&
    import.meta.env.VITE_DEPLOYMENT_MODE !== "enterprise");

if (enableSentry) {
  initSentry();
}

// Initialize GA only in cloud mode
const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "cloud";
if (deploymentMode === "cloud") {
  initializeGA();
}

// OAuth is only enabled for cloud deployments
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const enableOAuth = deploymentMode === "cloud";

if (!googleClientId && enableOAuth) {
  logger.warn(
    "VITE_GOOGLE_CLIENT_ID environment variable is not set. Google OAuth will not work."
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {enableOAuth && googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);
