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
          if (err?.data?.code === "UNAUTHORIZED") {
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
