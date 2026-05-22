/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_PORTAL_URL?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_DEPLOYMENT_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  dataLayer?: unknown[];
  __QAROTE_CONFIG__?: {
    apiUrl?: string;
    portalUrl?: string;
    demoMode?: string;
    deploymentMode?: string;
  };
}
