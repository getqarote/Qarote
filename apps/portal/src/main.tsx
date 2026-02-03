import "./index.css";

import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.tsx";
import { logger } from "./lib/logger";

// OAuth is only enabled for cloud deployments
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "cloud";
const enableOAuth = deploymentMode === "cloud";

if (!googleClientId && enableOAuth) {
  logger.warn(
    "VITE_GOOGLE_CLIENT_ID environment variable is not set. Google OAuth will not work."
  );
}

createRoot(document.getElementById("root")!).render(
  enableOAuth && googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  ) : (
    <App />
  )
);
