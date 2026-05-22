import type { AppRouter } from "@api/trpc/types";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";

/**
 * Detail payload of the `trpc:forbidden` DOM event.
 *
 * `permission` is the catalog key the procedure requires (server-controlled,
 * sourced from `PROPAGATED_CAUSE_CODES`). The listener uses it to i18n the
 * toast — `t()` is not available inside the link function.
 */
export interface TrpcForbiddenEventDetail {
  /** Catalog key the procedure required, or null if the server didn't send one. */
  permission: string | null;
}

/**
 * Surface backend `WORKSPACE_PERMISSION` denials as a toast on the
 * application side.
 *
 * Mutations only: background queries can legitimately fail FORBIDDEN
 * (a stale tab, a permission revoked behind the user's back, a
 * speculative refetch) and toasting on every one would produce ghost
 * messages the user can't act on. Surface the error in the query state
 * instead, and let the component decide what to show.
 *
 * The link runs outside React, so `t()` is not available; dispatch a
 * DOM event and let a small React listener show the toast (same
 * pattern as `unauthorizedLink` + `AuthContext`).
 */
export const forbiddenLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          const cause = (err as { data?: { cause?: { code?: string } } })?.data
            ?.cause;
          if (
            op.type === "mutation" &&
            (err as { data?: { code?: string } })?.data?.code === "FORBIDDEN" &&
            cause?.code === "WORKSPACE_PERMISSION" &&
            typeof window !== "undefined"
          ) {
            // `permission` is server-supplied from the catalog and may
            // legitimately be absent (e.g. tier-based denials). The
            // listener picks a generic vs targeted toast string based
            // on whether it has a name to substitute.
            const rawPermission = (cause as { permission?: string }).permission;
            const detail: TrpcForbiddenEventDetail = {
              permission:
                typeof rawPermission === "string" && rawPermission.length > 0
                  ? rawPermission
                  : null,
            };
            window.dispatchEvent(new CustomEvent("trpc:forbidden", { detail }));
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
