/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BASE_URL: string;
  readonly VITE_PORTAL_URL: string;
  readonly VITE_ENVIRONMENT: string;
  readonly PUBLIC_APP_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
