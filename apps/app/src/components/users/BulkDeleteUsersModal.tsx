import { useTranslation } from "react-i18next";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BulkDeleteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Usernames that will be deleted if the operator confirms. Passed
   * through so the dialog can show the actual names and so the parent
   * doesn't have to re-derive them from a selection Set.
   */
  usernames: string[];
  onConfirm: () => void;
  isLoading: boolean;
}

/**
 * Confirmation dialog for bulk deleting RabbitMQ users.
 *
 * Shows the pluralized "Delete N users?" title, the full list of names
 * (scrollable when long), and a destructive-variant confirm button.
 * Protected users are filtered upstream in `UsersTable`, so by the
 * time we reach this dialog every name is safe to delete.
 */
export function BulkDeleteUsersModal({
  isOpen,
  onClose,
  usernames,
  onConfirm,
  isLoading,
}: BulkDeleteUsersModalProps) {
  const { t } = useTranslation("users");
  const count = usernames.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className="h-5 w-5 text-destructive"
              aria-hidden="true"
            />
            {t("bulkDeleteTitle", { count })}
          </DialogTitle>
          <DialogDescription>
            {t("bulkDeleteDescription", { count })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-3">
          <ul className="space-y-1 font-mono text-sm tabular-nums">
            {usernames.map((name) => (
              <li key={name} className="truncate" title={name}>
                {name}
              </li>
            ))}
          </ul>
        </div>

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
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("deleting") : t("deleteSelected")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
