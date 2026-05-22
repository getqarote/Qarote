/**
 * Gates children behind a workspace permission check.
 *
 * Behaviour:
 *   null  (loading) — renders nothing (avoids layout shift; caller provides skeleton above)
 *   false (denied)  — renders `fallback` if provided, otherwise null
 *   true  (allowed) — renders children
 *
 * Usage:
 *   <RequirePermission permission="member:invite" fallback={<p>No access</p>}>
 *     <InviteMembersButton />
 *   </RequirePermission>
 */

import type { WorkspacePermission } from "@/lib/api/authTypes";

import { usePermission } from "@/hooks/queries/useWorkspaceRole";

import type { ReactNode } from "react";

interface RequirePermissionProps {
  permission: WorkspacePermission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const allowed = usePermission(permission);
  if (allowed === null) return null;
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
