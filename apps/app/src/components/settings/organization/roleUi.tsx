import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Shield, User } from "lucide-react";

/**
 * Org- and workspace-level role constants + visual helpers.
 *
 * Centralised here so every card, dialog, and badge across the org
 * settings surface agrees on what roles exist, what they're labelled
 * as, and what icon represents each one. Avoids the pre-refactor
 * situation where role strings were sprinkled through 1400 lines and
 * adding a new role meant grepping for "ADMIN" in six places.
 */

export type WsRole = "ADMIN" | "MEMBER";

export const WS_ROLE_OPTIONS: readonly WsRole[] = ["ADMIN", "MEMBER"];

/**
 * Returns the icon for a given role. Owner gets no icon (they're the
 * implicit one, and showing a crown would feel grandiose in a serious
 * operator dashboard). Admin gets a shield (gate-keeping), member
 * gets a generic user silhouette.
 */
export function getRoleIcon(role: string): ReactNode {
  switch (role) {
    case "OWNER":
      return null;
    case "ADMIN":
      return (
        <Shield
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      );
    default:
      return (
        <User
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      );
  }
}

/**
 * Maps a role to the badge variant that visually distinguishes it.
 * All roles use the orange rectangular style matching the landing page.
 */
export function getRoleBadgeVariant(): "soft-primary" {
  return "soft-primary";
}

/**
 * Translates role keys to display labels using the `profile` i18n
 * namespace. Returned as a record so consumers can do `labels[role]`
 * without repeated `t()` calls inside render.
 */
export function useRoleLabels(): Record<string, string> {
  const { t } = useTranslation("profile");
  return {
    OWNER: t("org.roleOwner"),
    ADMIN: t("org.roleAdmin"),
    MEMBER: t("org.roleMember"),
    READONLY: t("org.roleReadonly"),
  };
}
