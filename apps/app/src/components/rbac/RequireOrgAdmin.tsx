import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";

import { useIsOrgAdmin } from "@/hooks/queries/useOrganization";

import type { ReactNode } from "react";

interface RequireOrgAdminProps {
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
   * have a structural reason to redirect.
   *
   * Precedence: when both are set, `redirectTo` wins.
   */
  redirectTo?: string;
}

/**
 * Renders children only when the current user is an org admin (OWNER
 * or ADMIN of their organization).
 *
 * Mirrors `<RequireWorkspaceAdmin>` for the org scope: SMTP relay
 * configuration, license management, billing — surfaces whose authority
 * is org-level, not per-workspace.
 *
 * The loading wrapper owns its accessibility attributes (`role="status"`,
 * `aria-busy`, `aria-live`) so callers don't have to remember them.
 */
export function RequireOrgAdmin({
  children,
  loadingFallback,
  deniedFallback,
  redirectTo,
}: RequireOrgAdminProps) {
  const { t } = useTranslation("common");
  const isAdmin = useIsOrgAdmin();

  if (isAdmin === null) {
    // See RequireWorkspaceAdmin.tsx for the rationale on the
    // `<output>` sr-only live region vs. wrapping the skeleton in
    // `aria-live`. Same a11y contract.
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
