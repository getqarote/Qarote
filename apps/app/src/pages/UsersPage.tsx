import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";
import { RabbitMQUser } from "@/lib/api/userTypes";

import { filterByRegex } from "@/components/filterByRegex";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import {
  FullPageAlert,
  NoServerSelectedCard,
  PageShell,
} from "@/components/PageShell";
import { RegexFilterInput } from "@/components/RegexFilterInput";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TitleWithCount } from "@/components/ui/TitleWithCount";
import { AddUserButton } from "@/components/users/AddUserButton";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import { LoadingSkeleton } from "@/components/UsersList/LoadingSkeleton";
import { UsersTable } from "@/components/UsersList/UsersTable";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteUser, useUsers } from "@/hooks/queries/useRabbitMQUsers";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function UsersPage() {
  const { t } = useTranslation("users");
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [deleteUser, setDeleteUser] = useState<RabbitMQUser | null>(null);
  const [filterRegex, setFilterRegex] = useState("");

  const currentServerId = serverId || selectedServerId;
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: usersData,
    isLoading,
    error,
  } = useUsers(currentServerId, serverExists);

  const deleteUserMutation = useDeleteUser();
  const { workspace } = useWorkspace();

  const handleDeleteUser = async () => {
    if (!deleteUser || !workspace?.id || !currentServerId) {
      toast.error(t("requiredWorkspace"));
      return;
    }
    try {
      await deleteUserMutation.mutateAsync({
        serverId: currentServerId,
        workspaceId: workspace.id,
        username: deleteUser.name,
      });
      toast.success(t("deleteSuccess"));
      setDeleteUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteError"));
    }
  };

  // Guard: non-admins cannot reach this page
  if (user?.role !== UserRole.ADMIN) {
    return (
      <PageShell>
        <FullPageAlert message={t("accessDenied")} />
      </PageShell>
    );
  }

  // Guard: zero servers configured — onboarding state owns its own
  // content container, so render it bare to avoid double-wrapping.
  if (!hasServers) {
    return (
      <PageShell bare>
        <NoServerConfigured
          title={t("noServerTitle")}
          subtitle={t("pageSubtitle")}
          description={t("noServerDescription")}
        />
      </PageShell>
    );
  }

  // Guard: servers exist but none is selected yet.
  if (!currentServerId) {
    return (
      <PageShell>
        <NoServerSelectedCard
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
          heading={t("noServerSelected")}
          description={t("selectServerPrompt")}
        />
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
        </div>
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  const users = usersData?.users || [];
  const filteredUsers = filterByRegex(users, filterRegex, (u) => u.name);

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <TitleWithCount count={users.length}>
              {t("pageTitle")}
            </TitleWithCount>
          </div>
        </div>
        <AddUserButton serverId={currentServerId} />
      </div>

      <RegexFilterInput value={filterRegex} onChange={setFilterRegex} />

      <UsersTable
        users={filteredUsers}
        buildHref={(u) => `/users/${encodeURIComponent(u.name)}`}
        onDelete={(u) => setDeleteUser(u)}
      />

      {deleteUser && (
        <DeleteUserModal
          isOpen
          onClose={() => setDeleteUser(null)}
          user={deleteUser}
          onConfirm={handleDeleteUser}
          isLoading={deleteUserMutation.isPending}
        />
      )}
    </PageShell>
  );
}
