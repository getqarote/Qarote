import { Trans, useTranslation } from "react-i18next";

import { RabbitMQUser } from "@/lib/api/userTypes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: RabbitMQUser;
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeleteUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
  isLoading,
}: DeleteUserModalProps) {
  const { t } = useTranslation("users");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("deleteUser")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="users:deleteUserConfirmation"
              values={{ name: user.name }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive-outline"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("deleting") : t("deleteUser")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
