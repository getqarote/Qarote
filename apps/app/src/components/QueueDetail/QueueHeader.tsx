import { useTranslation } from "react-i18next";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Pause,
  Play,
  Send,
  Trash2,
} from "lucide-react";

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
  isAdmin?: boolean;
  isSpying?: boolean;
  onSpyToggle?: () => void;
  onNavigateBack: () => void;
  onRefetch: () => void;
  onDeleteQueue?: () => void;
}

export function QueueHeader({
  queueName,
  selectedServerId,
  messageCount,
  consumerCount = 0,
  isAdmin,
  isSpying = false,
  onSpyToggle,
  onNavigateBack,
  onRefetch,
  onDeleteQueue,
}: QueueHeaderProps) {
  const { t } = useTranslation("queues");

  // Get the actual pause status from the backend
  const { data: pauseStatus, refetch: refetchPauseStatus } =
    useQueuePauseStatus(selectedServerId, queueName);

  const isPaused = pauseStatus?.pauseState?.isPaused ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <SidebarTrigger className="mr-2 mt-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="mr-2 flex items-center gap-1 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="title-page break-all min-w-0">{queueName}</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Spy on Queue — read-only, available to all users */}
        {onSpyToggle && (
          <Button
            variant="outline"
            onClick={onSpyToggle}
            className="flex items-center gap-2"
          >
            {isSpying ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {isSpying ? t("stopSpy") : t("spyOnQueue")}
          </Button>
        )}

        {/* Admin-only write actions */}
        {isAdmin && (
          <>
            {/* Send Message Button */}
            <SendMessageDialog
              queueName={queueName}
              serverId={selectedServerId}
              onSuccess={onRefetch}
              trigger={
                <Button variant="outline" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {t("sendMessage")}
                </Button>
              }
            />

            {/* Purge Queue Button */}
            <PurgeQueueDialog
              queueName={queueName}
              messageCount={messageCount}
              onSuccess={onRefetch}
              trigger={
                <Button variant="outline" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {t("purgeQueue")}
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
                <Button variant="outline" className="flex items-center gap-2">
                  {isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                  {isPaused ? t("resumeQueue") : t("pauseQueue")}
                </Button>
              }
            />

            {/* Delete Queue Button */}
            {onDeleteQueue && (
              <Button
                onClick={onDeleteQueue}
                variant="outline"
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                {t("deleteQueue")}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
