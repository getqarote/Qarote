import { useState } from "react";

import { httpBatchLink, httpSubscriptionLink, splitLink } from "@trpc/client";

import { queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/runtimeConfig";

import { trpc } from "./client";
import { forbiddenLink } from "./forbiddenLink";
import { unauthorizedLink } from "./unauthorizedLink";

/**
 * Get the tRPC URL — combines runtime/build-time API base with the `/trpc`
 * suffix. Throws when no API URL is configured anywhere so a misconfigured
 * deploy fails loud at startup rather than silently 404'ing every request.
 */
const getTrpcUrl = () => {
  const apiUrl = getApiUrl();
  if (apiUrl == null) {
    throw new Error(
      "API URL not configured. Set VITE_API_URL or serve /config.js"
    );
  }
  return `${apiUrl}/trpc`;
};

/**
 * tRPC Provider component
 * Wraps the app with tRPC React Query provider.
 * Auth is handled via cookies (better-auth) — no Bearer token needed.
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        unauthorizedLink,
        forbiddenLink,
        splitLink({
          condition: (op) => op.type === "subscription",
          true: httpSubscriptionLink({
            url: getTrpcUrl(),
            eventSourceOptions: {
              withCredentials: true,
            },
          }),
          false: httpBatchLink({
            url: getTrpcUrl(),
            fetch(url, options) {
              return fetch(url, {
                ...options,
                credentials: "include",
              });
            },
          }),
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
