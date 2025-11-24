import { StrictMode } from "react";
import "./index.css";
import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import { initializeGA } from "./lib/ga";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";

initSentry();
initializeGA();

// Get Google OAuth client ID from environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.warn(
    "VITE_GOOGLE_CLIENT_ID environment variable is not set. Google OAuth will not work."
  );
}

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const posthogEnabled = import.meta.env.VITE_POSTHOG_ENABLED === "true";

if (!posthogKey) {
  console.warn(
    "VITE_PUBLIC_POSTHOG_KEY environment variable is not set. PostHog will not work."
  );
}

if (!posthogHost) {
  console.warn(
    "VITE_PUBLIC_POSTHOG_HOST environment variable is not set. PostHog will not work."
  );
}

console.log("posthogKey", posthogKey);
console.log("posthogHost", posthogHost);
console.log("posthogEnabled", posthogEnabled);
console.log("MODE", import.meta.env.MODE);
console.log("production", import.meta.env.MODE === "production");
console.log("development", import.meta.env.MODE === "development");
console.log("test", import.meta.env.MODE === "test");
console.log("staging", import.meta.env.MODE === "staging");
console.log("production", import.meta.env.MODE === "production");
console.log("development", import.meta.env.MODE === "development");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
