import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Search, X } from "lucide-react";

import { UserRole } from "@/lib/api";

import { NoServerConfigured } from "@/components/NoServerConfigured";
import { PageError } from "@/components/PageError";
import { NoServerSelectedCard, PageShell } from "@/components/PageShell";
import { QueueHeader } from "@/components/Queues/QueueHeader";
import { QueuesOverviewCards } from "@/components/Queues/QueuesOverviewCards";
import { QueueTable } from "@/components/Queues/QueueTable";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/AuthContextDefinition";
import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useQueues } from "@/hooks/queries/useRabbitMQ";
import { useUser } from "@/hooks/ui/useUser";

// No-op: data is kept fresh via the subscription automatically
const handleRefetch = () => {};

const Queues = () => {
  const { t } = useTranslation("queues");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { isLoading: workspaceLoading } = useUser();
  const [filterRegex, setFilterRegex] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const {
    data: queuesData,
    isLoading,
    isError,
  } = useQueues(selectedServerId, selectedVHost, hasServers);

  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);
  const queueCount = queues.length;

  const filteredQueues = useMemo(() => {
    if (!filterRegex) return queues;
    return queues.filter((queue) => {
      try {
        const regex = new RegExp(filterRegex, "i");
        return regex.test(queue.name) || regex.test(queue.vhost);
      } catch {
        return (
          queue.name.toLowerCase().includes(filterRegex.toLowerCase()) ||
          queue.vhost.toLowerCase().includes(filterRegex.toLowerCase())
        );
      }
    });
  }, [queues, filterRegex]);

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
        <PageError message={t("common:serverConnectionError")} />
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
            value={filterRegex}
            onChange={(e) => {
              setFilterRegex(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-8 h-9"
          />
          {filterRegex && (
            <button
              type="button"
              onClick={() => setFilterRegex("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Queues Table */}
      <QueueTable
        queues={paginatedQueues}
        isLoading={isLoading}
        searchTerm={filterRegex}
        isAdmin={isAdmin}
        onNavigateToQueue={(queueName) => navigate(`/queues/${queueName}`)}
        onRefetch={handleRefetch}
        total={filteredQueues.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </PageShell>
  );
};

export default Queues;
