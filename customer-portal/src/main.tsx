import "./index.css";

import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { logger } from "./lib/logger";

import App from "./App.tsx";

// Get Google OAuth client ID from environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE || "cloud";
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

createRoot(document.getElementById("root")!).render(<AppWrapper />);
