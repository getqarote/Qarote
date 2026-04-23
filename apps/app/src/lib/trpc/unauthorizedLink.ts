import type { AppRouter } from "@api/trpc/types";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";

export const unauthorizedLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          // Only trigger global sign-out for query/mutation UNAUTHORIZED errors.
          // SSE subscriptions may fail to send cookies cross-origin (different
          // ports in dev), which doesn't mean the session is actually invalid.
          if (
            err?.data?.code === "UNAUTHORIZED" &&
            op.type !== "subscription" &&
            typeof window !== "undefined"
          ) {
            window.dispatchEvent(new Event("auth:unauthorized"));
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};
