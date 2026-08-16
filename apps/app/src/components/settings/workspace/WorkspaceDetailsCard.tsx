import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagsInput } from "@/components/ui/tags-input";

import { ExtendedWorkspace } from "@/contexts/WorkspaceContextDefinition";

import { useUpdateWorkspace } from "@/hooks/queries/useWorkspaceApi";

import { extractErrorMessage } from "@/pages/settings/utils";

interface WorkspaceDetailsCardProps {
  workspace: ExtendedWorkspace;
  isAdmin: boolean;
  onSaved: () => void | Promise<unknown>;
}

const tagsKey = (tags: string[]) => tags.join("");

/**
 * Editable workspace settings (prototype `.scard` + `.row2` + `.savebar`):
 * name, contact email, and tags. Always-editable with a dirty-only Save —
 * matching the prototype — and admin-gated: non-admins see disabled fields and
 * a locked note instead of the Save bar.
 *
 * Owns its own form state and re-syncs from the workspace when it changes
 * (a save refetches), so the inputs never drift from the canonical values.
 */
export function WorkspaceDetailsCard({
  workspace,
  isAdmin,
  onSaved,
}: WorkspaceDetailsCardProps) {
  const { t } = useTranslation("profile");
  const updateWorkspace = useUpdateWorkspace();

  const [name, setName] = useState(workspace.name ?? "");
  const [contactEmail, setContactEmail] = useState(
    workspace.contactEmail ?? ""
  );
  const [tags, setTags] = useState<string[]>(workspace.tags ?? []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(workspace.name ?? "");
    setContactEmail(workspace.contactEmail ?? "");
    setTags(workspace.tags ?? []);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [workspace.name, workspace.contactEmail, workspace.tags]);

  const dirty =
    name !== (workspace.name ?? "") ||
    contactEmail !== (workspace.contactEmail ?? "") ||
    tagsKey(tags) !== tagsKey(workspace.tags ?? []);

  const handleSave = async () => {
    if (!isAdmin || !dirty || updateWorkspace.isPending) return;
    try {
      await updateWorkspace.mutateAsync({
        workspaceId: workspace.id,
        name,
        contactEmail: contactEmail || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      await onSaved();
      toast.success(t("toast.workspaceUpdated"));
    } catch (error) {
      logger.error("Workspace update error:", error);
      toast.error(t("toast.workspaceUpdateFailed"), {
        description: extractErrorMessage(error),
      });
    }
  };

  const disabled = !isAdmin || updateWorkspace.isPending;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ws-name">{t("workspace.name")}</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-email">{t("workspace.contactEmail")}</Label>
          <Input
            id="ws-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={t("workspace.contactEmailPlaceholder")}
            disabled={disabled}
            className="font-mono"
          />
        </div>
      </div>

      <div className="mt-3.5 space-y-1.5">
        <Label htmlFor="ws-tags">{t("workspace.tags")}</Label>
        <TagsInput
          value={tags}
          onChange={setTags}
          placeholder={t("workspace.tagsPlaceholder")}
          disabled={disabled}
        />
      </div>

      {isAdmin ? (
        <div className="mt-5 flex justify-end border-t border-border pt-4">
          <Button onClick={handleSave} disabled={!dirty || disabled}>
            {t("workspace.save")}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {t("workspace.adminOnly")}
        </p>
      )}
    </div>
  );
}
