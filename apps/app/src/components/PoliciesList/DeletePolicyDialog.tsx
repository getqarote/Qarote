import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeletePolicyDialogProps {
  open: boolean;
  policyName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePolicyDialog({
  open,
  policyName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeletePolicyDialogProps) {
  const { t } = useTranslation("policies");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteDescription", { policyName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            {t("common:cancel")}
          </Button>
          <Button
            variant="destructive-outline"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? t("deleting") : t("deletePolicy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
