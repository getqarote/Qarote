import { useTranslation } from "react-i18next";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

import { useDeleteSsoProvider } from "@/hooks/queries/useSsoProvider";

interface DeleteSSOProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/**
 * Confirmation dialog for deleting the SSO provider. Owns the delete
 * mutation and toast handling — the parent only needs to know when
 * the deletion succeeds so it can refetch.
 *
 * This is a big destructive action: deleting the provider disables
 * SSO for every user in the organization. The confirmation copy
 * spells that out explicitly rather than a generic "are you sure".
 */
export function DeleteSSOProviderDialog({
  open,
  onOpenChange,
  onDeleted,
}: DeleteSSOProviderDialogProps) {
  const { t } = useTranslation("sso");

  const deleteMutation = useDeleteSsoProvider({
    onSuccess: () => {
      toast.success(
        t("deleteSuccess", { defaultValue: "SSO provider deleted" })
      );
      onOpenChange(false);
      onDeleted();
    },
    onError: (error) =>
      toast.error(
        error.message ||
          t("deleteError", { defaultValue: "Failed to delete provider" })
      ),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("delete", { defaultValue: "Delete provider" })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteConfirm", {
              defaultValue:
                "Delete SSO provider? This will disable SSO for all users.",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            {t("common:cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="border border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            disabled={deleteMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate();
            }}
          >
            {deleteMutation.isPending && (
              <Loader2
                className="h-4 w-4 animate-spin mr-2"
                aria-hidden="true"
              />
            )}
            {t("delete", { defaultValue: "Delete provider" })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
