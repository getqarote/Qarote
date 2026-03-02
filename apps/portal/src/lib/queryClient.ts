import { QueryClient } from "@tanstack/react-query";

/**
 * Configure React Query client with intelligent retry logic and caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Don't retry on 429 (rate limit) errors
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          error.status === 429
        ) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        // Don't retry mutations on 429 errors
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          error.status === 429
        ) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});
