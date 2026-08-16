import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

interface WorkspaceDangerCardProps {
  workspaceName: string;
  onDelete: () => void;
  isDeleting: boolean;
}

/**
 * Danger zone (prototype `.danger`): delete the workspace. Red-wash block with
 * a type-the-name confirm dialog, mirroring the account/organization danger
 * zones. Only rendered for workspace admins.
 */
export function WorkspaceDangerCard({
  workspaceName,
  onDelete,
  isDeleting,
}: WorkspaceDangerCardProps) {
  const { t } = useTranslation("profile");
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-destructive/35 bg-destructive/5 p-6">
      <h3 className="text-sm font-semibold text-destructive">
        {t("workspace.deleteWorkspace")}
      </h3>
      <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
        {t("workspace.deleteDescription")}
      </p>
      <Button
        variant="destructive-outline"
        size="sm"
        className="mt-4"
        onClick={() => setOpen(true)}
      >
        {t("workspace.deleteWorkspace")}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title={t("workspace.deleteDialogTitle")}
        body={
          <Trans
            i18nKey="workspace.deleteDialogDescription"
            ns="profile"
            values={{ name: workspaceName }}
            components={{ strong: <strong /> }}
          />
        }
        typeToConfirm={workspaceName}
        confirmLabel={t("workspace.deleteConfirm")}
        pendingLabel={t("workspace.deleting")}
        cancelLabel={t("workspace.cancel")}
        isPending={isDeleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
