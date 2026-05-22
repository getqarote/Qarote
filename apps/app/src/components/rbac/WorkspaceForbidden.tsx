import { useTranslation } from "react-i18next";

import { ShieldX } from "lucide-react";

import type { RbacCauseCode, RbacErrorCause } from "@/lib/rbac/readRbacError";

import { Button } from "@/components/ui/button";

interface WorkspaceForbiddenProps {
  cause?: RbacErrorCause | null;
  onBack?: () => void;
}

const DETAIL_KEYS: Record<RbacCauseCode, string> = {
  WORKSPACE_PERMISSION: "forbidden.workspacePermission",
  LAST_OWNER_BLOCKED: "forbidden.lastOwnerBlocked",
  INVITER_ROLE_INSUFFICIENT: "forbidden.inviterRoleInsufficient",
};

export function WorkspaceForbidden({ cause, onBack }: WorkspaceForbiddenProps) {
  const { t } = useTranslation("rbac");

  const detailKey = cause?.code
    ? DETAIL_KEYS[cause.code]
    : "forbidden.workspacePermission";

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <ShieldX
        className="h-12 w-12 text-muted-foreground mb-4"
        aria-hidden={true}
      />
      <h2 className="text-lg font-semibold">{t("forbidden.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {t("forbidden.subtitle")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {t(detailKey)}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("forbidden.contactAdmin")}
      </p>
      {onBack && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onBack}>
          {t("forbidden.backToDashboard")}
        </Button>
      )}
    </div>
  );
}
