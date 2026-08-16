import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

import { useDeleteOrganization } from "@/hooks/queries/useOrganization";
import { SESSION_TOAST_KEY } from "@/hooks/ui/useSessionToast";

interface DeleteOrganizationCardProps {
  org: { name: string; slug: string };
}

/**
 * Danger-zone card to permanently delete the current organization (OWNER only —
 * the parent gates rendering). Requires typing the org slug to confirm; on
 * success the org/workspace context is gone, so we hard-reload to re-bootstrap.
 */
export function DeleteOrganizationCard({ org }: DeleteOrganizationCardProps) {
  const { t } = useTranslation("profile");
  const [open, setOpen] = useState(false);
  const deleteOrg = useDeleteOrganization();

  const handleDelete = () => {
    deleteOrg.mutate(
      { confirmation: org.slug },
      {
        onSuccess: () => {
          // Context (org + active workspace) is gone — a hard reload
          // re-bootstraps into the workspace selector / onboarding. The toast
          // is stashed for after the reload (a synchronous toast.success here
          // would be torn down before it ever paints).
          sessionStorage.setItem(
            SESSION_TOAST_KEY,
            JSON.stringify({ title: t("deleteOrg.success") })
          );
          window.location.assign("/");
        },
        onError: (err) => toast.error(err.message || t("deleteOrg.error")),
      }
    );
  };

  return (
    <div className="rounded-xl border border-destructive/35 bg-destructive/5 p-6">
      <h3 className="text-sm font-semibold text-destructive">
        {t("deleteOrg.title")}
      </h3>
      <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
        {t("deleteOrg.warning", { name: org.name })}
      </p>
      <Button
        variant="destructive-outline"
        size="sm"
        className="mt-4"
        onClick={() => setOpen(true)}
      >
        {t("deleteOrg.action")}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title={t("deleteOrg.confirmTitle")}
        warn={{
          tone: "danger",
          message: t("deleteOrg.confirmDesc", { name: org.name }),
        }}
        body={t("deleteOrg.warning", { name: org.name })}
        typeToConfirm={org.slug}
        confirmLabel={t("deleteOrg.confirm")}
        cancelLabel={t("deleteOrg.cancel")}
        isPending={deleteOrg.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
