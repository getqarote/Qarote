/// <reference types="vite/client" />

// Google Tag Manager type definitions
interface Window {
  dataLayer?: unknown[];
  __QAROTE_CONFIG__?: {
    apiUrl?: string;
    deploymentMode?: "cloud" | "selfhosted" | "";
  };
}
