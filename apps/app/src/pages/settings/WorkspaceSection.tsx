import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { WorkspaceFormState, WorkspaceInfoTab } from "@/components/profile";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useProfile } from "@/hooks/queries/useProfile";
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
} from "@/hooks/queries/useWorkspaceApi";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

const WorkspaceSection = () => {
  const { t } = useTranslation("profile");
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const { refetchUser } = useAuth();
  const { data: profileData } = useProfile();
  const navigate = useNavigate();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();

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
    } catch {
      toast.error(t("toast.workspaceDeleteFailed"));
      return;
    }

    // Refetch auth user so user.workspaceId updates (auth context uses reducer state,
    // not reactive to React Query cache invalidation)
    await refetchUser();
    toast.success(t("toast.workspaceDeleted"));
    // Always navigate to /workspace — its loading state acts as a clean transition:
    // if user has remaining workspaces, it redirects to /; otherwise shows creation form
    navigate("/workspace", { replace: true });
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
