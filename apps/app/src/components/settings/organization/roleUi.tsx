import { useTranslation } from "react-i18next";

/**
 * Org- and workspace-level role constants + label helper.
 *
 * Centralised here so every card and dialog across the org settings surface
 * agrees on what roles exist and what they're labelled as.
 */

export type WsRole = "ADMIN" | "MEMBER";

export const WS_ROLE_OPTIONS: readonly WsRole[] = ["ADMIN", "MEMBER"];

/**
 * Translates role keys to display labels using the `profile` i18n namespace.
 * Returned as a record so consumers can do `labels[role]` without repeated
 * `t()` calls inside render.
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
