import { useState } from "react";

import { httpBatchLink } from "@trpc/react-query";

import { queryClient } from "@/lib/queryClient";

import { trpc } from "./client";
import { unauthorizedLink } from "./unauthorizedLink";

/**
 * Get the API URL from environment variables
 */
const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error("VITE_API_URL environment variable is not set");
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
        httpBatchLink({
          url: getApiUrl(),
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
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
