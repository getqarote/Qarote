import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { WorkspaceFormState, WorkspaceInfoTab } from "@/components/profile";

import { useProfile } from "@/hooks/queries/useProfile";
import { useUpdateWorkspace } from "@/hooks/queries/useWorkspaceApi";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const WorkspaceSection = () => {
  const { t } = useTranslation("profile");
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const { data: profileData } = useProfile();
  const updateWorkspaceMutation = useUpdateWorkspace();

  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormState>({
    name: "",
    contactEmail: "",
  });

  const profile = profileData?.user;
  const isAdmin = profile?.role === "ADMIN";

  // Initialize form when workspace data first loads
  const [prevWorkspaceId, setPrevWorkspaceId] = useState<string | null>(null);
  if (workspace?.id && workspace.id !== prevWorkspaceId) {
    setPrevWorkspaceId(workspace.id);
    setWorkspaceForm({
      name: workspace.name || "",
      contactEmail: workspace.contactEmail || "",
    });
  }

  const handleUpdateWorkspace = async () => {
    if (!workspace?.id) {
      toast.error(t("toast.noWorkspaceFound"));
      return;
    }
    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: workspace.id,
        ...workspaceForm,
      });
      setEditingWorkspace(false);
      await refetchWorkspace();
      toast.success(t("toast.workspaceUpdated"));
    } catch {
      toast.error(t("toast.workspaceUpdateFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <WorkspaceInfoTab
        workspace={workspace}
        isAdmin={isAdmin}
        editingWorkspace={editingWorkspace}
        workspaceForm={workspaceForm}
        setWorkspaceForm={setWorkspaceForm}
        setEditingWorkspace={setEditingWorkspace}
        onUpdateWorkspace={handleUpdateWorkspace}
        isUpdating={updateWorkspaceMutation.isPending}
      />
    </div>
  );
};

export default WorkspaceSection;
