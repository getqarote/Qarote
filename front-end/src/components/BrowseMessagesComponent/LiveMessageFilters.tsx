import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Play,
  Square,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";

interface Queue {
  name: string;
  messages: number;
}

interface LiveMessageFiltersProps {
  selectedQueue: string;
  setSelectedQueue: (queue: string) => void;
  queues: Queue[];
  // Stream controls
  isStreamingMode?: boolean;
  isConnecting?: boolean;
  isConnected?: boolean;
  onToggleStreaming?: () => void;
  streamedMessagesCount?: number;
  onClearMessages?: () => void;
  lastHeartbeat?: string | null;
}

export const LiveMessageFilters = ({
  selectedQueue,
  setSelectedQueue,
  queues,
  isStreamingMode = false,
  isConnecting = false,
  isConnected = false,
  onToggleStreaming,
  streamedMessagesCount = 0,
  onClearMessages,
  lastHeartbeat,
}: LiveMessageFiltersProps) => {
  const showStreamControls = selectedQueue && selectedQueue !== "all";

  return (
    <div className="mb-6">
      <div className="mb-3">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Select Queue for Live Monitoring
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedQueue} onValueChange={setSelectedQueue}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select queue..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">Select a queue</div>
              </SelectItem>
              {queues.map((queue) => (
                <SelectItem key={queue.name} value={queue.name}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      {queue.name}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {queue.messages}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stream Control Button */}
          {showStreamControls && onToggleStreaming && (
            <Button
              variant={isStreamingMode ? "destructive" : "default"}
              size="sm"
              onClick={onToggleStreaming}
              disabled={isConnecting}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {isStreamingMode ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop Stream
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Stream
                </>
              )}
            </Button>
          )}

          {/* Connection Status Badge */}
          {showStreamControls && isStreamingMode && (
            <Badge
              variant={
                isConnected
                  ? "default"
                  : isConnecting
                    ? "secondary"
                    : "destructive"
              }
              className="flex items-center gap-1"
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : isConnecting ? (
                <Activity className="h-3 w-3 animate-pulse" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isConnected
                ? "Connected"
                : isConnecting
                  ? "Connecting..."
                  : "Disconnected"}
            </Badge>
          )}

          {/* Clear Messages Button */}
          {showStreamControls &&
            isStreamingMode &&
            streamedMessagesCount > 0 &&
            onClearMessages && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearMessages}
                className="whitespace-nowrap"
              >
                Clear Messages
              </Button>
            )}
        </div>

        {/* Heartbeat Info */}
        {showStreamControls && isStreamingMode && lastHeartbeat && (
          <div className="text-xs text-gray-500 mt-2">
            Last heartbeat: {new Date(lastHeartbeat).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};
