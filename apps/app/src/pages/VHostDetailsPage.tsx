import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";

import { PageError } from "@/components/PageError";
import { FullPageAlert, PageShell } from "@/components/PageShell";
import { LoadingSkeleton } from "@/components/VHostDetail/LoadingSkeleton";
import { SetVHostLimitsForm } from "@/components/VHostDetail/SetVHostLimitsForm";
import { SetVHostPermissionsForm } from "@/components/VHostDetail/SetVHostPermissionsForm";
import { VHostDangerZone } from "@/components/VHostDetail/VHostDangerZone";
import { VHostDetailHeader } from "@/components/VHostDetail/VHostDetailHeader";
import { VHostLimits } from "@/components/VHostDetail/VHostLimits";
import { VHostPermissionsTable } from "@/components/VHostDetail/VHostPermissionsTable";
import { VHostStats } from "@/components/VHostDetail/VHostStats";
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";
import { EditVHostModal } from "@/components/vhosts/EditVHostModal";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useUsers } from "@/hooks/queries/useRabbitMQUsers";
import {
  useDeleteVHost,
  useDeleteVHostPermissions,
  useSetVHostLimit,
  useSetVHostPermissions,
  useVHost,
} from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function VHostDetailsPage() {
  const { t } = useTranslation("vhosts");
  const { serverId, vhostName } = useParams<{
    serverId?: string;
    vhostName: string;
  }>();
  const { selectedServerId } = useServerContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // The user whose "Clear" button is currently in flight. Lets us show
  // the loading state on ONLY that row instead of disabling every clear
  // button in the table at once.
  const [pendingClearUser, setPendingClearUser] = useState<string | null>(null);

  // null means "use derived default from data", string means "user explicitly chose this"
  const [selectedUserOverride, setSelectedUserOverride] = useState<
    string | null
  >(null);
  const [configureRegexp, setConfigureRegexp] = useState(".*");
  const [writeRegexp, setWriteRegexp] = useState(".*");
  const [readRegexp, setReadRegexp] = useState(".*");
  const [maxConnections, setMaxConnections] = useState("");
  const [maxQueues, setMaxQueues] = useState("");

  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const currentServerId = serverId || selectedServerId;
  const decodedVHostName = decodeURIComponent(vhostName || "");
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: vhostData,
    isLoading,
    error,
  } = useVHost(currentServerId, decodedVHostName, serverExists);

  const { data: usersData } = useUsers(currentServerId, serverExists);

  const deleteVHostMutation = useDeleteVHost();
  const setPermissionsMutation = useSetVHostPermissions();
  const setLimitsMutation = useSetVHostLimit();
  const clearPermissionsMutation = useDeleteVHostPermissions();
  const { workspace } = useWorkspace();

  const derivedDefaultUser = useMemo(() => {
    if (usersData?.users?.length) {
      return usersData.users[0].name;
    }
    return "admin";
  }, [usersData]);

  const selectedUser = selectedUserOverride ?? derivedDefaultUser;

  const handleSetPermissions = async () => {
    if (!selectedUser || !configureRegexp || !writeRegexp || !readRegexp) {
      toast.error(t("requiredFields"));
      return;
    }
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    try {
      await setPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        vhostName: decodedVHostName,
        username: selectedUser,
        configure: configureRegexp,
        write: writeRegexp,
        read: readRegexp,
      });
      toast.success(t("permissionsSet"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to set permissions"
      );
    }
  };

  const handleSetLimits = async () => {
    if (!maxConnections && !maxQueues) {
      toast.error(t("setLimitsError"));
      return;
    }
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    try {
      const promises = [];
      if (maxConnections) {
        promises.push(
          setLimitsMutation.mutateAsync({
            serverId: currentServerId!,
            workspaceId: workspace.id,
            vhostName: decodedVHostName,
            limitType: "max-connections",
            value: parseInt(maxConnections),
          })
        );
      }
      if (maxQueues) {
        promises.push(
          setLimitsMutation.mutateAsync({
            serverId: currentServerId!,
            workspaceId: workspace.id,
            vhostName: decodedVHostName,
            limitType: "max-queues",
            value: parseInt(maxQueues),
          })
        );
      }
      await Promise.all(promises);
      toast.success(t("limitsSet"));
      setMaxConnections("");
      setMaxQueues("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set limits");
    }
  };

  const handleClearPermissions = async (username: string) => {
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    setPendingClearUser(username);
    try {
      await clearPermissionsMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        vhostName: decodedVHostName,
        username,
      });
      toast.success(t("permissionsCleared"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to clear permissions"
      );
    } finally {
      setPendingClearUser(null);
    }
  };

  const handleDeleteVHost = async () => {
    if (!workspace?.id) {
      toast.error("Workspace ID is required");
      return;
    }
    try {
      await deleteVHostMutation.mutateAsync({
        serverId: currentServerId!,
        workspaceId: workspace.id,
        vhostName: decodedVHostName,
      });
      toast.success(t("deleteSuccess"));
      navigate("/vhosts");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete virtual host"
      );
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
        <PageError message={t("common:serverConnectionError")} />
      </PageShell>
    );
  }

  const vhost = vhostData?.vhost;

  if (!vhost) {
    return (
      <PageShell>
        <FullPageAlert message={t("notFound")} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <VHostDetailHeader
        vhostName={decodedVHostName}
        vhost={vhost}
        onNavigateBack={() => navigate("/vhosts")}
        onEdit={() => setShowEditModal(true)}
      />

      <VHostStats vhost={vhost} />

      <VHostLimits vhost={vhost} />

      <VHostPermissionsTable
        permissions={vhost.permissions ?? []}
        pendingUser={pendingClearUser}
        onClear={handleClearPermissions}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SetVHostPermissionsForm
          users={usersData?.users ?? []}
          selectedUser={selectedUser}
          onSelectedUserChange={setSelectedUserOverride}
          configureRegexp={configureRegexp}
          onConfigureRegexpChange={setConfigureRegexp}
          writeRegexp={writeRegexp}
          onWriteRegexpChange={setWriteRegexp}
          readRegexp={readRegexp}
          onReadRegexpChange={setReadRegexp}
          onSubmit={handleSetPermissions}
          isPending={setPermissionsMutation.isPending}
        />

        <SetVHostLimitsForm
          maxConnections={maxConnections}
          onMaxConnectionsChange={setMaxConnections}
          maxQueues={maxQueues}
          onMaxQueuesChange={setMaxQueues}
          onSubmit={handleSetLimits}
          isPending={setLimitsMutation.isPending}
        />
      </div>

      <VHostDangerZone
        vhostName={decodedVHostName}
        onDeleteClick={() => setShowDeleteModal(true)}
      />

      {showEditModal && (
        <EditVHostModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          serverId={currentServerId}
          vhost={vhost}
        />
      )}

      {showDeleteModal && (
        <DeleteVHostModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          vhost={vhost}
          onConfirm={handleDeleteVHost}
          isLoading={deleteVHostMutation.isPending}
        />
      )}
    </PageShell>
  );
}
