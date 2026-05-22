import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Search } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageErrorOrGate } from "@/components/PageErrorOrGate";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { QueueHeader } from "@/components/Queues/QueueHeader";
import { QueuesOverviewCards } from "@/components/Queues/QueuesOverviewCards";
import { QueueTable } from "@/components/Queues/QueueTable";
import { Input } from "@/components/ui/input";
import { PixelX } from "@/components/ui/pixel-x";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useQueues } from "@/hooks/queries/useRabbitMQ";
import { useIsWorkspaceAdmin } from "@/hooks/queries/useWorkspaceRole";
import { useUser } from "@/hooks/ui/useUser";

// No-op: data is kept fresh via the subscription automatically
const handleRefetch = () => {};

const queueFiltersOptions = {
  history: "replace" as const,
  clearOnDefault: true,
};

const Queues = () => {
  const { t } = useTranslation("queues");
  const navigate = useNavigate();
  const isAdmin = useIsWorkspaceAdmin() === true;
  const { isLoading: workspaceLoading } = useUser();
  const [{ q: searchTerm, page, size: pageSize }, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
      size: parseAsInteger.withDefault(25),
    },
    queueFiltersOptions
  );
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const {
    data: queuesData,
    isLoading,
    isError,
    error: queuesError,
  } = useQueues(selectedServerId, selectedVHost, hasServers);

  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);
  const queueCount = queues.length;

  const filteredQueues = useMemo(() => {
    if (!searchTerm) return queues;
    const q = searchTerm.toLowerCase();
    return queues.filter(
      (queue) =>
        queue.name.toLowerCase().includes(q) ||
        queue.vhost.toLowerCase().includes(q)
    );
  }, [queues, searchTerm]);

  const paginatedQueues = useMemo(
    () => filteredQueues.slice((page - 1) * pageSize, page * pageSize),
    [filteredQueues, page, pageSize]
  );

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

  if (!selectedServerId) {
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

  if (isError) {
    return (
      <PageShell>
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="title-page">{t("pageTitle")}</h1>
          </div>
        </div>
        <PageErrorOrGate
          error={queuesError}
          fallbackMessage={t("common:serverConnectionError")}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex-1">
          <QueueHeader
            selectedServerId={selectedServerId}
            queueCount={queueCount}
            workspaceLoading={workspaceLoading}
            canAddQueue={true}
            canSendMessages={true}
            isAdmin={isAdmin}
            onRefetch={handleRefetch}
          />
        </div>
      </div>

      <QueuesOverviewCards queues={queues} isLoading={isLoading} />

      {/* Search / filter */}
      {queues.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => {
              void setFilters({ q: e.target.value, page: 1 });
            }}
            className="pl-9 pr-8 h-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => void setFilters({ q: "", page: 1 })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <PixelX className="h-4 w-auto shrink-0" />
            </button>
          )}
        </div>
      )}

      {/* Queues Table */}
      <QueueTable
        queues={paginatedQueues}
        isLoading={isLoading}
        searchTerm={searchTerm}
        isAdmin={isAdmin}
        onNavigateToQueue={(queueName) => navigate(`/queues/${queueName}`)}
        onRefetch={handleRefetch}
        total={filteredQueues.length}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => void setFilters({ page: p })}
        onPageSizeChange={(s) => void setFilters({ size: s, page: 1 })}
      />
    </PageShell>
  );
};

export default Queues;
