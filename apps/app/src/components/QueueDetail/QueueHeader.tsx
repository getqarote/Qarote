import { ArrowLeft, Pause, Play, Send, Trash2 } from "lucide-react";

import { PauseQueueDialog } from "@/components/PauseQueueDialog";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useQueuePauseStatus } from "@/hooks/queries/useRabbitMQ";

interface QueueHeaderProps {
  queueName: string;
  selectedServerId: string;
  messageCount: number;
  consumerCount?: number;
  onNavigateBack: () => void;
  onRefetch: () => void;
  onDeleteQueue?: () => void;
}

export function QueueHeader({
  queueName,
  selectedServerId,
  messageCount,
  consumerCount = 0,
  onNavigateBack,
  onRefetch,
  onDeleteQueue,
}: QueueHeaderProps) {
  // Get the actual pause status from the backend
  const { data: pauseStatus, refetch: refetchPauseStatus } =
    useQueuePauseStatus(selectedServerId, queueName);

  const isPaused = pauseStatus?.pauseState?.isPaused ?? false;

  return (
    <div className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{queueName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Send Message Button */}
          <SendMessageDialog
            queueName={queueName}
            serverId={selectedServerId}
            onSuccess={onRefetch}
            trigger={
              <Button
                variant="outline"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            }
          />

          {/* Purge Queue Button */}
          <PurgeQueueDialog
            queueName={queueName}
            messageCount={messageCount}
            onSuccess={onRefetch}
            trigger={
              <Button
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Purge Queue
              </Button>
            }
          />

          {/* Pause/Resume Queue Button */}
          <PauseQueueDialog
            queueName={queueName}
            consumerCount={consumerCount}
            isPaused={isPaused}
            onSuccess={() => {
              onRefetch();
              refetchPauseStatus();
            }}
            trigger={
              <Button
                variant="outline"
                className={`flex items-center gap-2 ${
                  isPaused
                    ? "text-green-600 hover:text-green-700"
                    : "text-yellow-600 hover:text-yellow-700"
                }`}
              >
                {isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
                {isPaused ? "Resume Queue" : "Pause Queue"}
              </Button>
            }
          />

          {/* Delete Queue Button */}
          {onDeleteQueue && (
            <Button
              onClick={onDeleteQueue}
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Queue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
