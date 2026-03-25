/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  dataLayer?: unknown[];
  __QAROTE_CONFIG__?: {
    apiUrl?: string;
    deploymentMode?: "cloud" | "selfhosted" | "";
  };
}
