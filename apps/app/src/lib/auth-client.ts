import { ssoClient } from "@better-auth/sso/client";
import { createAuthClient } from "better-auth/react";

function getBaseUrl() {
  const config = (window as unknown as Record<string, unknown>)
    .__QAROTE_CONFIG__ as { apiUrl?: string } | undefined;
  const apiUrl = import.meta.env.VITE_API_URL ?? config?.apiUrl;
  // Return origin or empty string (same-origin) — no /trpc suffix
  return apiUrl || window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [ssoClient()],
});
