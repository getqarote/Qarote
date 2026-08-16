import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { NoWorkspaceCard } from "@/components/profile/NoWorkspaceCard";
import { formatDate } from "@/components/profile/profileUtils";
import { WorkspaceDangerCard } from "@/components/settings/workspace/WorkspaceDangerCard";
import { WorkspaceDetailsCard } from "@/components/settings/workspace/WorkspaceDetailsCard";
import { IconCalendar, IconSettings, IconUser } from "@/components/ui/icons";

import { useAuth } from "@/contexts/AuthContextDefinition";

import { useDeleteWorkspace } from "@/hooks/queries/useWorkspaceApi";
import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";
import { useUser } from "@/hooks/ui/useUser";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

/**
 * `/settings/workspace` — the operational unit. A SectionHead over the editable
 * workspace card, a read-only facts card, and (for admins) the delete danger
 * zone. The prototype's "Default alert routing" card maps to notification
 * settings (edited on the Notifications page), so the real per-workspace
 * alerting default — the unacked-warning threshold — lives in the editable card
 * instead, and this page keeps the real Workspace facts.
 */
const WorkspaceSection = () => {
  const { t } = useTranslation("profile");
  const { workspace, refetch: refetchWorkspace } = useWorkspace();
  const { user, updateUser, refetchUser } = useAuth();
  const { planData } = useUser();
  const navigate = useNavigate();
  const deleteWorkspaceMutation = useDeleteWorkspace();
  const isAdmin = useIsWorkspaceAdmin() === true;

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

    // Update auth context immediately from the mutation response to avoid a
    // stale workspaceId (auth context uses reducer state, not the query cache).
    if (user) {
      updateUser({ ...user, workspaceId: result.switchedTo ?? undefined });
    } else {
      try {
        await refetchUser();
      } catch {
        // Continue even if refetch fails — deletion already succeeded.
      }
    }
    toast.success(t("toast.workspaceDeleted"));
    // /onboarding redirects to / if other workspaces remain, else shows setup.
    navigate("/onboarding", { replace: true });
  };

  if (!workspace) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("workspace.sectionTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("workspace.sectionSubtitle")}
          </p>
        </div>
        <NoWorkspaceCard />
      </div>
    );
  }

  const facts = [
    {
      icon: IconUser,
      label: t("workspace.users"),
      value: planData?.usage.users.current ?? "—",
    },
    {
      icon: IconSettings,
      label: t("workspace.servers"),
      value: planData?.usage.servers.current ?? "—",
    },
    {
      icon: IconCalendar,
      label: t("workspace.created"),
      value: formatDate(workspace.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("workspace.sectionTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("workspace.sectionSubtitle")}
        </p>
      </div>

      <WorkspaceDetailsCard
        key={workspace.id}
        workspace={workspace}
        isAdmin={isAdmin}
        onSaved={refetchWorkspace}
      />

      {/* Facts */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">{t("workspace.facts")}</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {facts.map(({ icon: Icon, label, value }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Icon className="h-4 w-auto shrink-0" aria-hidden="true" />
              {label}{" "}
              <span className="font-mono tabular-nums text-foreground">
                {value}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("workspace.factsHint")}
        </p>
      </div>

      {isAdmin && (
        <WorkspaceDangerCard
          workspaceName={workspace.name}
          onDelete={handleDeleteWorkspace}
          isDeleting={deleteWorkspaceMutation.isPending}
        />
      )}
    </div>
  );
};

export default WorkspaceSection;
