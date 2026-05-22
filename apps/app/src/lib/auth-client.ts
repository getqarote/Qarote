import { ssoClient } from "@better-auth/sso/client";
import { createAuthClient } from "better-auth/react";

import { getApiUrl } from "@/lib/runtimeConfig";

function getBaseUrl() {
  // Return origin or empty string (same-origin) — no /trpc suffix
  return getApiUrl() || window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [ssoClient()],
});
