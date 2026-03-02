/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BASE_URL: string;
  readonly VITE_PORTAL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
