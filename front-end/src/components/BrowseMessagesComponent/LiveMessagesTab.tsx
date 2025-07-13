import { useMemo } from "react";
import { Wifi, WifiOff, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LiveMessageFilters,
  MessageList,
  formatPayload,
  getPayloadType,
} from "@/components/BrowseMessagesComponent";
import logger from "@/lib/logger";
import { Queue } from "@/lib/api/types";
import { UseMessageStreamReturn } from "@/hooks/useMessageStream";

interface LiveMessagesTabProps {
  selectedQueue: string;
  setSelectedQueue: (queue: string) => void;
  queues: Queue[];
  isLoadingQueues: boolean;
  expandedMessages: Set<number>;
  onToggleExpanded: (index: number) => void;
  // Message stream data
  messageStream: UseMessageStreamReturn;
  isStreamingMode: boolean;
  setIsStreamingMode: (streaming: boolean) => void;
}

export function LiveMessagesTab({
  selectedQueue,
  setSelectedQueue,
  queues,
  isLoadingQueues,
  expandedMessages,
  onToggleExpanded,
  messageStream,
  isStreamingMode,
  setIsStreamingMode,
}: LiveMessagesTabProps) {
  const {
    messages: streamedMessages,
    queueStats,
    isConnected,
    isConnecting,
    error: streamError,
    lastHeartbeat,
    connect,
    disconnect,
    clearMessages: clearStreamedMessages,
  } = messageStream;

  // Convert streamed messages to the format expected by MessageList
  const displayMessages = useMemo(() => {
    return streamedMessages.map((msg) => ({
      payload: msg.message.payload,
      properties: msg.message.properties,
      routing_key: msg.message.routingKey || "",
      exchange: msg.message.exchange || "",
      message_count: msg.message.messageCount || 0,
      redelivered: msg.message.redelivered || false,
      timestamp: msg.timestamp,
    }));
  }, [streamedMessages]);

  const handleToggleStreaming = () => {
    if (isStreamingMode) {
      logger.info("User stopping message stream");
      setIsStreamingMode(false);
      //   disconnect();
    } else {
      logger.info("User starting message stream");
      setIsStreamingMode(true);
      clearStreamedMessages();
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      {isStreamingMode && queueStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {queueStats.stats.messages.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">In queue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Ready Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {queueStats.stats.messages_ready.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">Ready for consumption</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Consumers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {queueStats.stats.consumers}
              </div>
              <p className="text-xs text-gray-600">Active consumers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Publish Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {queueStats.stats.publishRate.toFixed(1)}
              </div>
              <p className="text-xs text-gray-600">msg/sec</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connection Status Alerts */}
      {selectedQueue && selectedQueue !== "all" && isStreamingMode && (
        <Alert>
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-start gap-2">
              <div className="text-sm">
                <strong>
                  Live streaming active for queue: {selectedQueue}
                </strong>
                <p className="text-gray-600 mt-1">
                  Messages are being streamed in real-time. Stream will
                  automatically stop if connection is lost.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Warning for Streaming */}
      {selectedQueue && selectedQueue !== "all" && !isStreamingMode && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            <div className="text-sm">
              <strong>Real-time streaming available</strong>
              <p className="text-gray-600 mt-1">
                Start live streaming to monitor messages in real-time. Note that
                streaming may impact performance on high-traffic queues.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {streamError && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <strong>Streaming Error:</strong> {streamError}
          </AlertDescription>
        </Alert>
      )}

      {/* Live Message Filters with Stream Controls */}
      <LiveMessageFilters
        selectedQueue={selectedQueue}
        setSelectedQueue={setSelectedQueue}
        queues={queues}
        isStreamingMode={isStreamingMode}
        isConnecting={isConnecting}
        isConnected={isConnected}
        onToggleStreaming={handleToggleStreaming}
        streamedMessagesCount={streamedMessages.length}
        onClearMessages={clearStreamedMessages}
        lastHeartbeat={lastHeartbeat}
      />

      {/* Message List */}
      <MessageList
        filteredMessages={displayMessages}
        isLoadingMessages={isLoadingQueues || isConnecting}
        expandedMessages={expandedMessages}
        onToggleExpanded={onToggleExpanded}
        formatPayload={formatPayload}
        getPayloadType={getPayloadType}
        selectedQueue={selectedQueue}
      />
    </div>
  );
}
