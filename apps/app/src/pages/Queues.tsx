import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AppSidebar } from "@/components/AppSidebar";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { QueueHeader } from "@/components/Queues/QueueHeader";
import { QueueTable } from "@/components/Queues/QueueTable";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { useQueues } from "@/hooks/queries/useRabbitMQ";
import { useUser } from "@/hooks/ui/useUser";

// No-op: data is kept fresh via the subscription automatically
const handleRefetch = () => {};

const Queues = () => {
  const { t } = useTranslation("queues");
  const navigate = useNavigate();
  const { isLoading: workspaceLoading } = useUser();
  const [filterRegex, setFilterRegex] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { selectedServerId, hasServers } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { data: queuesData, isLoading } = useQueues(
    selectedServerId,
    selectedVHost,
    hasServers
  );

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
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title={t("noServerTitle")}
              description={t("noServerDescription")}
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!selectedServerId) {
    return (
      <SidebarProvider>
        <div className="page-layout">
          <AppSidebar />
          <main className="main-content-scrollable">
            <div className="content-container-large">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="title-page">{t("pageTitle")}</h1>
                    <p className="text-gray-500">{t("selectServerPrompt")}</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="page-layout">
        <AppSidebar />
        <main className="main-content-scrollable">
          <div className="content-container-large">
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
                  onRefetch={handleRefetch}
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-4">
              <Input
                placeholder={t("filterRegex")}
                value={filterRegex}
                onChange={(e) => {
                  setFilterRegex(e.target.value);
                  setPage(1);
                }}
                className="max-w-xs"
              />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>+/-</span>
              </div>
            </div>

            {/* Queues Table */}
            <QueueTable
              queues={paginatedQueues}
              isLoading={isLoading}
              searchTerm={filterRegex}
              onNavigateToQueue={(queueName) =>
                navigate(`/queues/${queueName}`)
              }
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Queues;
