import { useTranslation } from "react-i18next";

import { ArrowLeft } from "lucide-react";

import type { RabbitMQUser } from "@/lib/api/userTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface UserDetailHeaderProps {
  username: string;
  user: RabbitMQUser;
  isConnectionUser: boolean;
  isProtectedUser: boolean;
  onNavigateBack: () => void;
  onEdit: () => void;
}

export function UserDetailHeader({
  username,
  user,
  isConnectionUser,
  isProtectedUser,
  onNavigateBack,
  onEdit,
}: UserDetailHeaderProps) {
  const { t } = useTranslation("users");

  const editDisabled = isConnectionUser || isProtectedUser;
  const disabledReason = isConnectionUser
    ? t("cannotModifyConnectionUser")
    : isProtectedUser
      ? t("cannotModifyProtectedUser")
      : undefined;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2 min-w-0">
        <SidebarTrigger className="mr-2 mt-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="mr-2 flex items-center gap-1 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="title-page break-words min-w-0">
              {t("userPrefix", { name: username })}
            </h1>
            {user.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            <Badge variant="outline">
              {user.password_hash ? t("passwordSet") : t("noPassword")}
            </Badge>
          </div>
          {disabledReason && (
            <p className="text-sm text-muted-foreground mt-1">
              {disabledReason}
            </p>
          )}
        </div>
      </div>
      <Button
        onClick={onEdit}
        disabled={editDisabled}
        className="btn-primary rounded-none shrink-0"
        title={disabledReason}
      >
        {t("common:edit")}
      </Button>
    </div>
  );
}
