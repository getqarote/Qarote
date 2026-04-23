import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";

import { PageError } from "@/components/PageError";
import { FullPageAlert, PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/VHostDetail/LoadingSkeleton";
import { SetVHostLimitsForm } from "@/components/VHostDetail/SetVHostLimitsForm";
import { SetVHostPermissionsForm } from "@/components/VHostDetail/SetVHostPermissionsForm";
import { VHostDangerZone } from "@/components/VHostDetail/VHostDangerZone";
import { VHostDetailHeader } from "@/components/VHostDetail/VHostDetailHeader";
import { VHostLimits } from "@/components/VHostDetail/VHostLimits";
import { VHostPermissionsTable } from "@/components/VHostDetail/VHostPermissionsTable";
import { VHostStats } from "@/components/VHostDetail/VHostStats";
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
import { useUpdateWorkspace } from "@/hooks/queries/useWorkspaceApi";
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
    dataUpdatedAt,
  } = useVHost(currentServerId, decodedVHostName, serverExists);

  const { data: usersData } = useUsers(currentServerId, serverExists);

  const deleteVHostMutation = useDeleteVHost();
  const setPermissionsMutation = useSetVHostPermissions();
  const setLimitsMutation = useSetVHostLimit();
  const clearPermissionsMutation = useDeleteVHostPermissions();
  const updateWorkspaceMutation = useUpdateWorkspace();
  const { workspace, refetch: refetchWorkspace } = useWorkspace();

  const thresholdKey = currentServerId
    ? `${currentServerId}:${decodedVHostName}`
    : null;
  const workspaceDefault = workspace?.unackedWarnThreshold ?? 100;
  const vhostThresholds = workspace?.vhostThresholds as
    | Record<string, number>
    | undefined;
  const storedOverride = thresholdKey
    ? vhostThresholds?.[thresholdKey]
    : undefined;

  const [thresholdInput, setThresholdInput] = useState<string>(
    storedOverride !== undefined ? String(storedOverride) : ""
  );

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
        err instanceof Error ? err.message : t("setPermissionsError")
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
      toast.error(err instanceof Error ? err.message : t("setLimitsError"));
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
        err instanceof Error ? err.message : t("clearPermissionsError")
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
      toast.error(err instanceof Error ? err.message : t("deleteError"));
    }
  };

  const handleSaveThreshold = async () => {
    if (!workspace?.id || !thresholdKey) return;
    const value = parseInt(thresholdInput, 10);
    if (isNaN(value) || value < 0) return;
    const updated = { ...(vhostThresholds ?? {}), [thresholdKey]: value };
    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: workspace.id,
        vhostThresholds: updated,
      });
      await refetchWorkspace();
      toast.success(t("thresholdSaved"));
    } catch {
      toast.error(t("thresholdSaveError"));
    }
  };

  const handleClearThreshold = async () => {
    if (!workspace?.id || !thresholdKey) return;
    const updated = { ...(vhostThresholds ?? {}) };
    delete updated[thresholdKey];
    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: workspace.id,
        vhostThresholds: updated,
      });
      await refetchWorkspace();
      setThresholdInput("");
      toast.success(t("thresholdReset"));
    } catch {
      toast.error(t("thresholdSaveError"));
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

      <VHostStats vhost={vhost} dataUpdatedAt={dataUpdatedAt} />

      <VHostLimits vhost={vhost} />

      {/* Monitoring threshold */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h2 className="title-section">{t("monitoring")}</h2>
        </div>
        <div className="p-4 space-y-2">
          <Label htmlFor="vhostThreshold">{t("unackedThresholdLabel")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="vhostThreshold"
              type="number"
              min={0}
              max={100000}
              className="w-36"
              placeholder={String(workspaceDefault)}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleSaveThreshold}
              disabled={
                updateWorkspaceMutation.isPending ||
                thresholdInput === "" ||
                isNaN(parseInt(thresholdInput, 10))
              }
            >
              {t("common:save")}
            </Button>
            {storedOverride !== undefined && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearThreshold}
                disabled={updateWorkspaceMutation.isPending}
              >
                {t("thresholdResetToDefault", { default: workspaceDefault })}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {storedOverride !== undefined
              ? t("thresholdOverrideActive", { value: storedOverride })
              : t("thresholdUsingDefault", { default: workspaceDefault })}
          </p>
        </div>
      </div>

      <VHostPermissionsTable
        permissions={vhost.permissions ?? []}
        pendingUser={pendingClearUser}
        onClear={handleClearPermissions}
      />

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

      <VHostDangerZone
        vhostName={decodedVHostName}
        onDeleteClick={handleDeleteVHost}
        isDeleting={deleteVHostMutation.isPending}
      />

      {showEditModal && (
        <EditVHostModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          serverId={currentServerId}
          vhost={vhost}
        />
      )}
    </PageShell>
  );
}
