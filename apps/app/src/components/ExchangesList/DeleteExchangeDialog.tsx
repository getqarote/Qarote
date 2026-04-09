import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface DeleteExchangeDialogProps {
  open: boolean;
  exchangeName: string;
  isDeleting: boolean;
  onCancel: () => void;
  /**
   * Called when the operator confirms. Receives `force` — when true,
   * the deletion proceeds even if the exchange still has bindings.
   */
  onConfirm: (force: boolean) => void;
}

/**
 * Confirmation dialog for deleting an exchange. The "force delete"
 * checkbox is off by default — the safer path — and resets whenever
 * the dialog closes so a previous force-delete session doesn't leak
 * into the next confirmation.
 */
export function DeleteExchangeDialog({
  open,
  exchangeName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteExchangeDialogProps) {
  const { t } = useTranslation("exchanges");
  const [forceDelete, setForceDelete] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForceDelete(false);
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteDescription", { exchangeName })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="force-delete"
            checked={forceDelete}
            onCheckedChange={(checked) => setForceDelete(checked === true)}
          />
          <Label htmlFor="force-delete" className="text-sm font-medium">
            {t("forceDelete")}
          </Label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setForceDelete(false);
              onCancel();
            }}
            disabled={isDeleting}
          >
            {t("common:cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(forceDelete)}
            disabled={isDeleting}
          >
            {isDeleting
              ? t("deleting")
              : forceDelete
                ? t("forceDeleteExchange")
                : t("deleteExchange")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
