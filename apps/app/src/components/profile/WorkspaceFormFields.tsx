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
    unackedWarnThreshold?: number;
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-1.5">
      <div className="text-xs font-medium text-muted-foreground truncate">
        {label}
      </div>
      <div className="text-sm text-foreground text-right leading-tight">
        {value}
      </div>
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
            <div className="space-y-2">
              <Label htmlFor="workspaceUnackedWarnThreshold">
                {t("workspace.unackedWarnThreshold")}
              </Label>
              <Input
                id="workspaceUnackedWarnThreshold"
                type="number"
                min={0}
                max={100000}
                value={workspaceForm.unackedWarnThreshold}
                onChange={(e) =>
                  setWorkspaceForm({
                    ...workspaceForm,
                    unackedWarnThreshold: Math.max(
                      0,
                      parseInt(e.target.value, 10) || 0
                    ),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("workspace.unackedWarnThresholdDesc")}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border bg-muted/30 px-4 py-2">
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
            <ReadOnlyRow
              label={t("workspace.unackedWarnThreshold")}
              value={
                <span className="font-mono text-sm">
                  {workspace.unackedWarnThreshold ?? 100}
                </span>
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
                <Badge key={tag} variant="soft-primary">
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
