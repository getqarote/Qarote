import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { WorkspaceFormState, WorkspaceInfoTab } from "@/components/profile";

import { useNavigate } from "react-router";

import { useProfile } from "@/hooks/queries/useProfile";
import {
  useDeleteWorkspace,
  useSwitchWorkspace,
  useUpdateWorkspace,
  useUserWorkspaces,
} from "@/hooks/queries/useWorkspaceApi";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const WorkspaceSection = () => {
  const { t } = useTranslation("profile");
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const { data: profileData } = useProfile();
  const navigate = useNavigate();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const switchWorkspaceMutation = useSwitchWorkspace();
  const { data: userWorkspaces } = useUserWorkspaces();

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

  const handleDeleteWorkspace = async () => {
    if (!workspace?.id) return;
    try {
      await deleteWorkspaceMutation.mutateAsync({ workspaceId: workspace.id });
      toast.success(t("toast.workspaceDeleted"));

      const remaining = userWorkspaces?.filter((w) => w.id !== workspace.id);
      if (remaining?.length) {
        await switchWorkspaceMutation.mutateAsync({
          workspaceId: remaining[0].id,
        });
        navigate("/", { replace: true });
      } else {
        navigate("/workspace", { replace: true });
      }
    } catch {
      toast.error(t("toast.workspaceDeleteFailed"));
    }
  };

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
        onDeleteWorkspace={handleDeleteWorkspace}
        isDeleting={deleteWorkspaceMutation.isPending}
      />
    </div>
  );
};

export default WorkspaceSection;
