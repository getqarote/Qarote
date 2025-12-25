import { useState } from "react";

import { httpBatchLink } from "@trpc/react-query";

import { queryClient } from "@/lib/queryClient";

import { trpc } from "./client";

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
