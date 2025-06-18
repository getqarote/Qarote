import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Server } from "lucide-react";
import {
  MessageBrowserHeader,
  MessageFilters,
  MessageList,
  formatPayload,
  getPayloadType,
} from "@/components/MessageBrowser";
import { useMessageBrowser } from "@/hooks/useMessageBrowser";

const MessageBrowser = () => {
  const {
    selectedServerId,
    selectedQueue,
    setSelectedQueue,
    messageCount,
    setMessageCount,
    searchTerm,
    setSearchTerm,
    expandedMessages,
    isLoadingMessages,
    messageStats,
    queues,
    filteredMessages,
    messagesData,
    loadMessages,
    toggleMessageExpanded,
  } = useMessageBrowser();

  if (!selectedServerId) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
          <AppSidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="text-center py-12">
                <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  No Server Selected
                </h2>
                <p className="text-gray-600">
                  Please select a RabbitMQ server to browse messages.
                </p>
              </div>
            </div>
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
          <MessageBrowserHeader
            messageStats={messageStats}
            selectedQueue={selectedQueue}
          />

          <div className="p-6">
            <MessageFilters
              selectedQueue={selectedQueue}
              setSelectedQueue={setSelectedQueue}
              messageCount={messageCount}
              setMessageCount={setMessageCount}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              queues={queues}
              filteredMessagesLength={filteredMessages.length}
              totalMessagesLength={messagesData.length}
              isLoadingMessages={isLoadingMessages}
            />

            <MessageList
              filteredMessages={filteredMessages}
              isLoadingMessages={isLoadingMessages}
              expandedMessages={expandedMessages}
              onToggleExpanded={toggleMessageExpanded}
              formatPayload={formatPayload}
              getPayloadType={getPayloadType}
              searchTerm={searchTerm}
              selectedQueue={selectedQueue}
              onClearSearch={() => setSearchTerm("")}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MessageBrowser;
