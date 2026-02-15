import { useState } from "react";

import { httpBatchLink } from "@trpc/react-query";

import { queryClient } from "@/lib/queryClient";

import { trpc } from "./client";

/**
 * Get the API URL from runtime config (binary) or environment variables (Docker/Dokku)
 */
const getApiUrl = () => {
  // VITE_API_URL (build-time) wins — set in Docker/cloud deployments.
  // __QAROTE_CONFIG__ (runtime) is the fallback — dynamically served in binary mode.
  // The static public/config.js sets apiUrl:"" as a safe same-origin default;
  // it must not shadow a build-time VITE_API_URL.
  const config = (window as unknown as Record<string, unknown>)
    .__QAROTE_CONFIG__ as { apiUrl?: string } | undefined;
  const apiUrl = import.meta.env.VITE_API_URL ?? config?.apiUrl;
  if (apiUrl == null) {
    throw new Error(
      "API URL not configured. Set VITE_API_URL or serve /config.js"
    );
  }
  return `${apiUrl}/trpc`;
};

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

/**
 * tRPC Provider component
 * Wraps the app with tRPC React Query provider
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getApiUrl(),
          headers: () => {
            const token = getAuthToken();
            return token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {};
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  );
}
