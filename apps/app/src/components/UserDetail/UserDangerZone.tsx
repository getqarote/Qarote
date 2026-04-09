import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle className="title-section text-destructive">
          {t("dangerZone")}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
