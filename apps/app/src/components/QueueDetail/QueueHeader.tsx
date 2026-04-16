import { useTranslation } from "react-i18next";

import { PauseQueueDialog } from "@/components/PauseQueueDialog";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdownMenu";
import { PixelChevronDown } from "@/components/ui/pixel-chevron-down";
import { PixelChevronLeft } from "@/components/ui/pixel-chevron-left";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { useQueuePauseStatus } from "@/hooks/queries/useRabbitMQ";

interface QueueHeaderProps {
  queueName: string;
  selectedServerId: string;
  messageCount: number;
  consumerCount?: number;
  isAdmin?: boolean;
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
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <SidebarTrigger className="mr-2 mt-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="mr-2 flex items-center gap-1 shrink-0"
          >
            <PixelChevronLeft className="h-4 w-auto shrink-0" />
          </Button>
          <h1 className="title-page break-all min-w-0">{queueName}</h1>
        </div>

        {/* Admin actions grouped in dropdown */}
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-none">
                  {t("actions")}
                  <PixelChevronDown className="ml-1 h-3.5 w-auto shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <SendMessageDialog
                  queueName={queueName}
                  serverId={selectedServerId}
                  onSuccess={onRefetch}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      {t("sendMessage")}
                    </DropdownMenuItem>
                  }
                />
                <PauseQueueDialog
                  queueName={queueName}
                  consumerCount={consumerCount}
                  isPaused={isPaused}
                  onSuccess={() => {
                    onRefetch();
                    refetchPauseStatus();
                  }}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      {isPaused ? t("resumeQueue") : t("pauseQueue")}
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuSeparator />
                <PurgeQueueDialog
                  queueName={queueName}
                  messageCount={messageCount}
                  onSuccess={onRefetch}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive"
                    >
                      {t("purgeQueue")}
                    </DropdownMenuItem>
                  }
                />
                {onDeleteQueue && (
                  <DropdownMenuItem
                    onClick={onDeleteQueue}
                    className="text-destructive focus:text-destructive"
                  >
                    {t("deleteQueue")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
