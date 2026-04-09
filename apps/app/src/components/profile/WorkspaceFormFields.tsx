import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagsInput } from "@/components/ui/tags-input";

import { WorkspaceFormState } from "./profileUtils";

interface WorkspaceFormFieldsProps {
  editingWorkspace: boolean;
  isAdmin: boolean;
  workspaceForm: WorkspaceFormState;
  setWorkspaceForm: (form: WorkspaceFormState) => void;
  workspace: {
    name: string;
    contactEmail?: string;
    tags?: string[];
  };
  userEmail?: string;
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground sm:text-right">{value}</div>
    </div>
  );
}

export const WorkspaceFormFields = ({
  editingWorkspace,
  isAdmin,
  workspaceForm,
  setWorkspaceForm,
  workspace,
  userEmail: _userEmail,
}: WorkspaceFormFieldsProps) => {
  const { t } = useTranslation("profile");
  return (
    <>
      <div className="space-y-4">
        {editingWorkspace && isAdmin ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="workspaceName">{t("workspace.name")}</Label>
              <Input
                id="workspaceName"
                value={workspaceForm.name}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceContactEmail">
                {t("workspace.contactEmail")}
              </Label>
              <Input
                id="workspaceContactEmail"
                type="email"
                value={workspaceForm.contactEmail}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    contactEmail: e.target.value,
                  })
                }
                placeholder={t("workspace.contactEmailPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {t("workspace.contactEmailDesc")}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <ReadOnlyRow label={t("workspace.name")} value={workspace.name} />
            <ReadOnlyRow
              label={t("workspace.contactEmail")}
              value={
                workspace.contactEmail ? (
                  <span className="font-mono text-sm">
                    {workspace.contactEmail}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("workspace.notSet")}
                  </span>
                )
              }
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t("workspace.tags")}</Label>
        {editingWorkspace && isAdmin ? (
          <TagsInput
            value={workspaceForm.tags}
            onChange={(tags) => setWorkspaceForm({ ...workspaceForm, tags })}
            placeholder={t("workspace.tagsPlaceholder")}
          />
        ) : (
          <div className="flex flex-wrap gap-2 py-1">
            {workspace.tags && workspace.tags.length > 0 ? (
              workspace.tags.map((tag) => (
                <Badge key={tag} variant="soft-muted">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("workspace.notSet")}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
};
