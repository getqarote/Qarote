import "@/styles/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/i18n";

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
