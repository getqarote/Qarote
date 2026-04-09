import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";

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
  const { user, updateUser, refetchUser } = useAuth();
  const { data: profileData } = useProfile();
  const navigate = useNavigate();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();

  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormState>({
    name: "",
    contactEmail: "",
    tags: [],
  });

  const profile = profileData?.user;
  const isAdmin = profile?.role === UserRole.ADMIN;

  const resetFormFromWorkspace = () => {
    setWorkspaceForm({
      name: workspace?.name || "",
      contactEmail: workspace?.contactEmail || "",
      tags: workspace?.tags || [],
    });
  };

  const extractSafeErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return undefined;
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace?.id) return;
    let result;
    try {
      result = await deleteWorkspaceMutation.mutateAsync({
        workspaceId: workspace.id,
      });
    } catch {
      toast.error(t("toast.workspaceDeleteFailed"));
      return;
    }
    const switchedTo = result.switchedTo;

    // Update auth context immediately from the mutation response to avoid a
    // stale workspaceId (auth context uses reducer state, not React Query cache).
    // Fall back to refetchUser if user is not yet available in context.
    if (user) {
      updateUser({ ...user, workspaceId: switchedTo ?? undefined });
    } else {
      try {
        await refetchUser();
      } catch {
        // Continue even if refetch fails — deletion already succeeded
      }
    }
    toast.success(t("toast.workspaceDeleted"));
    // Navigate to /onboarding — its loading state acts as a clean transition:
    // if user has remaining workspaces, it redirects to /; otherwise shows the setup form
    navigate("/onboarding", { replace: true });
  };

  const handleUpdateWorkspace = async () => {
    if (!workspace?.id) {
      toast.error(t("toast.noWorkspaceFound"));
      return;
    }
    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: workspace.id,
        name: workspaceForm.name,
        contactEmail: workspaceForm.contactEmail || undefined,
        tags: workspaceForm.tags.length > 0 ? workspaceForm.tags : undefined,
      });
      setEditingWorkspace(false);
      await refetchWorkspace();
      toast.success(t("toast.workspaceUpdated"));
    } catch (error) {
      toast.error(t("toast.workspaceUpdateFailed"), {
        description: extractSafeErrorMessage(error),
      });
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
        onStartEdit={() => {
          resetFormFromWorkspace();
          setEditingWorkspace(true);
        }}
        onCancelEdit={() => {
          resetFormFromWorkspace();
          setEditingWorkspace(false);
        }}
        onUpdateWorkspace={handleUpdateWorkspace}
        isUpdating={updateWorkspaceMutation.isPending}
        onDeleteWorkspace={handleDeleteWorkspace}
        isDeleting={deleteWorkspaceMutation.isPending}
      />
    </div>
  );
};

export default WorkspaceSection;
