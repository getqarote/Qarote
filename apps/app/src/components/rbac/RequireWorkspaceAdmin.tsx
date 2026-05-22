import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";

import type { ReactNode } from "react";

interface RequireWorkspaceAdminProps {
  children: ReactNode;
  /**
   * Required. Shown while the role query is in flight
   * (`isAdmin === null`). Pass the page-specific LoadingSkeleton so
   * the loading→loaded transition is visually continuous.
   */
  loadingFallback: ReactNode;
  /**
   * Shown when the role query resolves to a non-admin
   * (`isAdmin === false`). Pass a `<PermissionDeniedCard>` so demoted
   * users see why they're blocked — the product standard is "stay on
   * the URL, explain why" (docs/plans/rbac-require-admin-components.md
   * §4.5). Defaults to `null` for forward-compat.
   */
  deniedFallback?: ReactNode;
  /**
   * If set, denial triggers `<Navigate to={redirectTo} replace />`
   * INSTEAD OF rendering `deniedFallback`. Reserved for callers that
   * have a structural reason to redirect; the 6 sites in the original
   * migration all use `deniedFallback`.
   *
   * Precedence: when both are set, `redirectTo` wins.
   */
  redirectTo?: string;
}

/**
 * Renders children only when the current user is a workspace admin.
 *
 * Branches on the tri-state `useIsWorkspaceAdmin()` so the loading
 * window is visually distinct from the denied state, eliminating the
 * "access-denied flash on hard refresh" bug for full-page admin gates.
 *
 * The loading wrapper owns its accessibility attributes (`role="status"`,
 * `aria-busy`, `aria-live`) so callers don't have to remember them.
 */
export function RequireWorkspaceAdmin({
  children,
  loadingFallback,
  deniedFallback,
  redirectTo,
}: RequireWorkspaceAdminProps) {
  const { t } = useTranslation("common");
  const isAdmin = useIsWorkspaceAdmin();

  if (isAdmin === null) {
    // The sr-only `<output>` is the live region (implicit role=status +
    // aria-live=polite). Keeping it as a sibling of the skeleton rather
    // than wrapping the skeleton inside `aria-live` avoids spurious
    // re-announces if the visible skeleton subtree mutates. `aria-busy`
    // on the outer container still signals "operation in progress" to
    // assistive tech crawling the subtree.
    return (
      <div aria-busy="true">
        {loadingFallback}
        <output className="sr-only">{t("loadingPermissions")}</output>
      </div>
    );
  }

  if (!isAdmin) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return <>{deniedFallback ?? null}</>;
  }

  return <>{children}</>;
}
