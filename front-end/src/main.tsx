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

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
);
