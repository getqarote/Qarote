import { useTranslation } from "react-i18next";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";

import { useRemoveOrgMember } from "@/hooks/queries/useOrganization";

interface RemoveMemberDialogProps {
  member: { id: string; email: string } | null;
  onClose: () => void;
}

/**
 * Confirmation dialog for removing an org member. Controlled entirely
 * by the parent — when `member` is null the dialog is closed; when it
 * holds a member value the dialog is open and confirms against that
 * member's email.
 *
 * Owns the mutation directly rather than taking an `onConfirm`
 * callback. The parent just tells it which member to confirm removal
 * of, and the dialog handles the rest.
 */
export function RemoveMemberDialog({
  member,
  onClose,
}: RemoveMemberDialogProps) {
  const { t } = useTranslation("profile");
  const removeMutation = useRemoveOrgMember();

  const handleConfirm = async () => {
    if (!member) return;
    try {
      await removeMutation.mutateAsync({ memberId: member.id });
      toast.success(t("org.toast.memberRemoved"));
      onClose();
    } catch (error) {
      logger.error({ error }, "Remove member error");
      toast.error(
        error instanceof Error
          ? error.message
          : t("org.toast.memberRemoveFailed")
      );
    }
  };

  return (
    <AlertDialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("org.removeMemberTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("org.removeMemberDesc", { email: member?.email ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            {t("org.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="border border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            disabled={removeMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {removeMutation.isPending ? (
              <Loader2
                className="h-4 w-4 animate-spin mr-2"
                aria-hidden="true"
              />
            ) : null}
            {t("org.remove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
