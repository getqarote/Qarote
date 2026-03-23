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
      <div className="space-y-2">
        <Label htmlFor="workspaceName">{t("workspace.name")}</Label>
        {editingWorkspace && isAdmin ? (
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
        ) : (
          <p className="text-sm p-2 border rounded-md bg-muted">
            {workspace.name}
          </p>
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
                <Badge key={tag} variant="outline" className="text-xs">
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
