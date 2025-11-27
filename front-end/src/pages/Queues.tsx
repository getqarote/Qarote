import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Input } from "@/components/ui/input";
import { NoServerConfigured } from "@/components/NoServerConfigured";
import { useServerContext } from "@/contexts/ServerContext";
import { useUser } from "@/hooks/useUser";
import { useQueues } from "@/hooks/useApi";
import { QueueHeader } from "@/components/Queues/QueueHeader";
import { QueueTable } from "@/components/Queues/QueueTable";
import logger from "@/lib/logger";

const Queues = () => {
  const navigate = useNavigate();
  const { isLoading: workspaceLoading } = useUser();
  const [filterRegex, setFilterRegex] = useState("");
  const { selectedServerId, hasServers } = useServerContext();
  const { data: queuesData, isLoading, refetch } = useQueues(selectedServerId);

  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);
  const queueCount = queues.length;

  // Wrapper for refetch with logging to debug refresh issues
  const handleRefetch = async () => {
    logger.info("Queues page: Refetching queue data...");
    try {
      await refetch();

      logger.info("Queues page: Refetch completed successfully");
    } catch (error) {
      logger.error("Queues page: Refetch failed:", error);
    }
  };

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
              title="Queues"
              description="Add a RabbitMQ server connection to view and manage queues across your clusters."
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
                    <h1 className="title-page">Queues</h1>
                    <p className="text-gray-500">
                      Please select a RabbitMQ server to view queues
                    </p>
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
                placeholder="Filter regex"
                value={filterRegex}
                onChange={(e) => setFilterRegex(e.target.value)}
                className="max-w-xs"
              />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>+/-</span>
              </div>
            </div>

            {/* Queues Table */}
            <QueueTable
              queues={filteredQueues}
              isLoading={isLoading}
              searchTerm={filterRegex}
              onNavigateToQueue={(queueName) =>
                navigate(`/queues/${queueName}`)
              }
              onRefetch={handleRefetch}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Queues;
