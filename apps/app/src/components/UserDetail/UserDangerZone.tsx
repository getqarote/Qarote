import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface UserDangerZoneProps {
  username: string;
  isConnectionUser: boolean;
  isProtectedUser: boolean;
  onDeleteClick: () => void;
}

export function UserDangerZone({
  username,
  isConnectionUser,
  isProtectedUser,
  onDeleteClick,
}: UserDangerZoneProps) {
  const { t } = useTranslation("users");

  const isAdminUser = username === "admin";
  const disabled = isAdminUser || isConnectionUser || isProtectedUser;

  const disabledReason = isConnectionUser
    ? t("cannotModifyConnectionUser")
    : isProtectedUser
      ? t("cannotModifyProtectedUser")
      : isAdminUser
        ? t("cannotDeleteAdmin")
        : undefined;

  return (
    <div className="rounded-lg border border-destructive/30 overflow-hidden">
      <div className="px-4 py-3 bg-destructive/5 border-b border-destructive/30">
        <h2 className="title-section text-destructive">{t("dangerZone")}</h2>
      </div>
      <div className="p-4">
        <Button
          variant="destructive"
          onClick={onDeleteClick}
          disabled={disabled}
          title={disabledReason}
        >
          {t("deleteUser")}
        </Button>
        {disabledReason && (
          <p className="text-sm text-muted-foreground mt-2">{disabledReason}</p>
        )}
      </div>
    </div>
  );
}
