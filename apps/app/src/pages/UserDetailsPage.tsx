import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";

import { PageErrorOrGate } from "@/components/PageErrorOrGate";
import { FullPageAlert, PageShell } from "@/components/PageShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSkeleton } from "@/components/UserDetail/LoadingSkeleton";
import { SetUserPermissionsForm } from "@/components/UserDetail/SetUserPermissionsForm";
import { UserDangerZone } from "@/components/UserDetail/UserDangerZone";
import { UserDetailHeader } from "@/components/UserDetail/UserDetailHeader";
import { UserLimits } from "@/components/UserDetail/UserLimits";
import { UserPermissionsTable } from "@/components/UserDetail/UserPermissionsTable";
import { EditUserModal } from "@/components/users/EditUserModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import {
  useDeleteUser,
  useDeleteUserPermissions,
  useSetUserPermissions,
  useUser,
} from "@/hooks/queries/useRabbitMQUsers";
import { useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function UserDetailsPage() {
  const { t } = useTranslation("users");
  const { serverId, username } = useParams<{
    serverId?: string;
    username: string;
  }>();
  const { selectedServerId } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showEditModal, setShowEditModal] = useState(false);

  // The vhost whose "Clear" button is currently in flight. Lets us show
  // the loading state on ONLY that row instead of disabling every clear
  // button in the table at once.
  const [pendingClearVhost, setPendingClearVhost] = useState<string | null>(
    null
  );

  // null means "use derived default from data", string means "user explicitly chose this"
  const [selectedVHostOverride, setSelectedVHostOverride] = useState<
    string | null
  >(null);
  const [configureRegexp, setConfigureRegexp] = useState("^$");
  const [writeRegexp, setWriteRegexp] = useState("^$");
  const [readRegexp, setReadRegexp] = useState("^$");

  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const currentServerId = serverId || selectedServerId;
  const decodedUsername = decodeURIComponent(username || "");
  const currentServer = currentServerId
    ? servers.find((s) => s.id === currentServerId)
    : undefined;
  const serverExists = !!currentServer;

  // The account Qarote uses to connect — we must not let it be edited away
  // from under the running app.
  const isConnectionUser = currentServer?.username === decodedUsername;

  const {
    data: userData,
    isLoading,
    error,
  } = useUser(currentServerId, decodedUsername, serverExists);

  // AWS-managed accounts carry a "protected" tag and must not be mutated.
  const isProtectedUser = userData?.user?.tags?.includes("protected") ?? false;

  const { data: vhostsData, isLoading: vhostsLoading } = useVHosts(
    currentServerId,
    serverExists
  );

  const derivedDefaultVHost = useMemo(() => {
    if (vhostsData?.vhosts?.length) {
      // Prefer the vhost the user already has permissions on
      if (userData?.permissions?.length) {
        return userData.permissions[0].vhost;
      }
      const hasDefaultVhost = vhostsData.vhosts.some((v) => v.name === "/");
      return hasDefaultVhost ? "/" : vhostsData.vhosts[0].name;
    }
    return "/";
  }, [vhostsData, userData?.permissions]);

  const selectedVHost = selectedVHostOverride ?? derivedDefaultVHost;

  const deleteUserMutation = useDeleteUser();
  const setPermissionsMutation = useSetUserPermissions();
  const clearPermissionsMutation = useDeleteUserPermissions();
  const { workspace } = useWorkspace();

  const handleSetPermissions = async () => {
    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }
    try {
      await setPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        username: decodedUsername,
        vhost: selectedVHost,
        configure: configureRegexp,
        write: writeRegexp,
        read: readRegexp,
      });
      toast.success(t("permissionsSet"));
      setSelectedVHostOverride(null);
      setConfigureRegexp("^$");
      setWriteRegexp("^$");
      setReadRegexp("^$");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("setPermissionsError")
      );
    }
  };

  const handleClearPermissions = async (vhost: string) => {
    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }
    setPendingClearVhost(vhost);
    try {
      await clearPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        username: decodedUsername,
        vhost,
      });
      toast.success(t("permissionsCleared"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("clearPermissionsError")
      );
    } finally {
      setPendingClearVhost(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!workspace?.id) {
      toast.error(t("requiredWorkspace"));
      return;
    }
    try {
      await deleteUserMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        username: decodedUsername,
      });
      toast.success(t("deleteSuccess"));
      navigate("/users");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteError"));
    }
  };

  // Guard: non-admins cannot reach this page at all
  if (user?.role !== UserRole.ADMIN) {
    return (
      <PageShell>
        <FullPageAlert message={t("accessDenied")} />
      </PageShell>
    );
  }

  if (!currentServerId) {
    return (
      <PageShell>
        <FullPageAlert message={t("selectServer")} />
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
        <PageErrorOrGate
          error={error}
          fallbackMessage={t("common:serverConnectionError")}
        />
      </PageShell>
    );
  }

  const userDetails = userData?.user;
  const permissions = userData?.permissions || [];

  if (!userDetails) {
    return (
      <PageShell>
        <FullPageAlert message={t("notFound")} />
      </PageShell>
    );
  }

  return (
    <TooltipProvider>
      <PageShell>
        <UserDetailHeader
          username={decodedUsername}
          user={userDetails}
          isConnectionUser={isConnectionUser}
          isProtectedUser={isProtectedUser}
          onNavigateBack={() => navigate("/users")}
          onEdit={() => setShowEditModal(true)}
        />

        {userDetails.limits && <UserLimits limits={userDetails.limits} />}

        <UserPermissionsTable
          permissions={permissions}
          pendingVhost={pendingClearVhost}
          onClear={handleClearPermissions}
        />

        <SetUserPermissionsForm
          vhosts={vhostsData?.vhosts ?? []}
          vhostsLoading={vhostsLoading}
          selectedVHost={selectedVHost}
          onSelectedVHostChange={setSelectedVHostOverride}
          configureRegexp={configureRegexp}
          onConfigureRegexpChange={setConfigureRegexp}
          writeRegexp={writeRegexp}
          onWriteRegexpChange={setWriteRegexp}
          readRegexp={readRegexp}
          onReadRegexpChange={setReadRegexp}
          onSubmit={handleSetPermissions}
          isPending={setPermissionsMutation.isPending}
        />

        <UserDangerZone
          username={decodedUsername}
          isConnectionUser={isConnectionUser}
          isProtectedUser={isProtectedUser}
          onDeleteClick={handleDeleteUser}
          isDeleting={deleteUserMutation.isPending}
        />

        {showEditModal && (
          <EditUserModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            serverId={currentServerId}
            user={userDetails}
          />
        )}
      </PageShell>
    </TooltipProvider>
  );
}
