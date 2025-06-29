import { useState, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Server, Zap, History } from "lucide-react";
import { MessageBrowserHeader } from "@/components/MessageBrowser";
import { LiveMessagesTab } from "@/components/MessageBrowser/LiveMessagesTab";
import { MessageHistoryTab } from "@/components/MessageBrowser/MessageHistoryTab";
import { useMessageStream } from "@/hooks/useMessageStream";
import { useQueues } from "@/hooks/useApi";
import { useServerContext } from "@/contexts/ServerContext";
import { useMessageHistoryAccess } from "@/hooks/useMessageHistory";
import { NoServerConfigured } from "@/components/NoServerConfigured";

const MessageBrowser = () => {
  const { selectedServerId } = useServerContext();
  const [selectedQueue, setSelectedQueue] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(
    new Set()
  );
  const [isStreamingMode, setIsStreamingMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");

  // Get all queues for the filter dropdown
  const { data: queuesData, isLoading: queuesLoading } =
    useQueues(selectedServerId);

  const queues = useMemo(() => queuesData?.queues || [], [queuesData?.queues]);

  // Check if user has access to message history
  const { data: historyAccess } = useMessageHistoryAccess(
    selectedServerId || undefined
  );

  const messageStream = useMessageStream({
    queueName: selectedQueue,
    serverId: selectedServerId || "",
    enabled:
      isStreamingMode &&
      !!selectedQueue &&
      !!selectedServerId &&
      selectedQueue !== "all",
  });

  const toggleMessageExpanded = (index: number) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMessages(newExpanded);
  };

  console.log("Selected Server ID:", selectedServerId);

  if (!selectedServerId) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
            </div>
            <NoServerConfigured
              title="Message Browser"
              description="Add a RabbitMQ server connection to browse messages."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <MessageBrowserHeader />

          <div className="p-6">
            <Tabs
              value={activeTab}
              onValueChange={(value: string) =>
                setActiveTab(value as "live" | "history")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="live" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Live Messages
                  <Badge variant="secondary" className="ml-2">
                    All Plans
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Message History
                  {historyAccess?.canAccessMessageHistory ? (
                    <Badge variant="secondary" className="ml-2">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-2">
                      Premium
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="live" className="mt-6">
                <LiveMessagesTab
                  selectedQueue={selectedQueue}
                  setSelectedQueue={setSelectedQueue}
                  queues={queues}
                  isLoadingQueues={queuesLoading}
                  expandedMessages={expandedMessages}
                  onToggleExpanded={toggleMessageExpanded}
                  messageStream={messageStream}
                  isStreamingMode={isStreamingMode}
                  setIsStreamingMode={setIsStreamingMode}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <MessageHistoryTab
                  serverId={selectedServerId}
                  selectedQueue={selectedQueue}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  expandedMessages={expandedMessages}
                  onToggleExpanded={toggleMessageExpanded}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MessageBrowser;
