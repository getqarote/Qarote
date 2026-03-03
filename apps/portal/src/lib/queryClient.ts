import { QueryClient } from "@tanstack/react-query";

function isNonRetriableError(error: unknown): boolean {
  if (error && typeof error === "object") {
    // Check standard HTTP status
    if ("status" in error && (error.status === 401 || error.status === 429)) {
      return true;
    }
    // Check tRPC error shape (error.data.httpStatus)
    if (
      "data" in error &&
      error.data &&
      typeof error.data === "object" &&
      "httpStatus" in error.data &&
      (error.data.httpStatus === 401 || error.data.httpStatus === 429)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Configure React Query client with intelligent retry logic and caching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        if (isNonRetriableError(error)) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        if (isNonRetriableError(error)) return false;
        return failureCount < 1;
      },
    },
  },
});
