import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

import { useDeleteAccount } from "@/hooks/queries/useDeleteAccount";
import { SESSION_TOAST_KEY } from "@/hooks/ui/useSessionToast";

interface DeleteAccountCardProps {
  email: string;
}

/**
 * Danger-zone card to permanently delete the caller's own account. Requires
 * typing the account email to confirm. On success the server has already
 * destroyed the session (cascade), so we sign out and hard-navigate to login.
 */
export function DeleteAccountCard({ email }: DeleteAccountCardProps) {
  const { t } = useTranslation("profile");
  const [open, setOpen] = useState(false);
  const deleteAccount = useDeleteAccount();

  const handleDelete = () => {
    deleteAccount.mutate(
      { confirmation: email },
      {
        onSuccess: () => {
          // Session is already gone server-side. Stash the toast so it shows on
          // the login screen (SignIn consumes SESSION_TOAST_KEY), then leave.
          // signOut is best-effort local cleanup — fire-and-forget, since the
          // hard nav wipes all client state regardless.
          sessionStorage.setItem(
            SESSION_TOAST_KEY,
            JSON.stringify({ title: t("deleteAccount.success") })
          );
          void authClient.signOut().catch(() => {});
          window.location.assign("/");
        },
        // Surfaces the localized server message, incl. the sole-owner block.
        onError: (err) => toast.error(err.message || t("deleteAccount.error")),
      }
    );
  };

  return (
    <div className="rounded-xl border border-destructive/35 bg-destructive/5 p-6">
      <h3 className="text-sm font-semibold text-destructive">
        {t("deleteAccount.title")}
      </h3>
      <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
        {t("deleteAccount.desc")}
      </p>
      <Button
        variant="destructive-outline"
        size="sm"
        className="mt-4"
        onClick={() => setOpen(true)}
      >
        {t("deleteAccount.action")}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title={t("deleteAccount.confirmTitle")}
        warn={{ tone: "danger", message: t("deleteAccount.confirmDesc") }}
        body={t("deleteAccount.warning")}
        typeToConfirm={email}
        confirmLabel={t("deleteAccount.confirm")}
        cancelLabel={t("deleteAccount.cancel")}
        isPending={deleteAccount.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
