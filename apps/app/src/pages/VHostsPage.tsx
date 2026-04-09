import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { toast } from "sonner";

import { UserRole } from "@/lib/api";

import { AddVirtualHostButton } from "@/components/AddVirtualHostButton";
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
import { DeleteVHostModal } from "@/components/vhosts/DeleteVHostModal";
import { LoadingSkeleton } from "@/components/VHostsList/LoadingSkeleton";
import { VHostsTable } from "@/components/VHostsList/VHostsTable";
import type { VHostListItem } from "@/components/VHostsList/VHostsTableRow";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";

import { useDeleteVHost, useVHosts } from "@/hooks/queries/useRabbitMQVHosts";
import { useServers } from "@/hooks/queries/useServer";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

export default function VHostsPage() {
  const { t } = useTranslation("vhosts");
  const { serverId } = useParams<{ serverId: string }>();
  const { selectedServerId, hasServers } = useServerContext();
  const { user } = useAuth();
  const { data: serversData } = useServers();
  const servers = serversData?.servers || [];

  const [deleteVHost, setDeleteVHost] = useState<VHostListItem | null>(null);
  const [filterRegex, setFilterRegex] = useState("");

  const currentServerId = serverId || selectedServerId;
  const serverExists = currentServerId
    ? servers.some((s) => s.id === currentServerId)
    : false;

  const {
    data: vhostsData,
    isLoading,
    error,
  } = useVHosts(currentServerId, serverExists);

  const deleteVHostMutation = useDeleteVHost();
  const { workspace } = useWorkspace();

  const handleDeleteVHost = async () => {
    if (!deleteVHost || !workspace?.id || !currentServerId) {
      toast.error("Workspace ID is required");
      return;
    }
    try {
      await deleteVHostMutation.mutateAsync({
        serverId: currentServerId,
        workspaceId: workspace.id,
        vhostName: deleteVHost.name,
      });
      toast.success(t("deleteSuccess"));
      setDeleteVHost(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete virtual host"
      );
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

  const vhosts = (vhostsData?.vhosts || []) as VHostListItem[];
  const filteredVhosts = filterByRegex(vhosts, filterRegex, (v) => v.name);

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <TitleWithCount count={vhosts.length}>
              {t("pageTitle")}
            </TitleWithCount>
          </div>
        </div>
        <AddVirtualHostButton serverId={currentServerId} />
      </div>

      <RegexFilterInput value={filterRegex} onChange={setFilterRegex} />

      <VHostsTable
        vhosts={filteredVhosts}
        buildHref={(v) => `/vhosts/${encodeURIComponent(v.name)}`}
        onDelete={(v) => setDeleteVHost(v)}
      />

      {deleteVHost && (
        <DeleteVHostModal
          isOpen
          onClose={() => setDeleteVHost(null)}
          vhost={deleteVHost}
          onConfirm={handleDeleteVHost}
          isLoading={deleteVHostMutation.isPending}
        />
      )}
    </PageShell>
  );
}
