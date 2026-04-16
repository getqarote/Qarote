import { useTranslation } from "react-i18next";

import { AddQueueButton } from "@/components/AddQueueButton";
import { AddSendMessageButton } from "@/components/AddSendMessageButton";
import { PageHeader } from "@/components/ui/PageHeader";

interface QueueHeaderProps {
  selectedServerId: string;
  queueCount: number;
  workspaceLoading: boolean;
  canAddQueue: boolean;
  canSendMessages: boolean;
  isAdmin?: boolean;
  onAddQueueClick?: () => void;
  onSendMessageClick?: () => void;
  onRefetch?: () => void;
}

export function QueueHeader({
  selectedServerId,
  queueCount,
  workspaceLoading,
  isAdmin,
  onRefetch,
}: QueueHeaderProps) {
  const { t } = useTranslation("queues");
  const actions = isAdmin ? (
    <>
      <AddSendMessageButton serverId={selectedServerId} onSuccess={onRefetch} />
      <AddQueueButton serverId={selectedServerId} onSuccess={onRefetch} />
    </>
  ) : null;

  // Show the row count inline with the title so users know magnitude before
  // parsing the table. Hidden while workspace is still loading to avoid a
  // distracting "0" flash.
  const titleNode = (
    <span className="flex items-baseline gap-2">
      {t("pageTitle")}
      {!workspaceLoading && (
        <span className="text-xl font-normal text-muted-foreground tabular-nums">
          {queueCount.toLocaleString()}
        </span>
      )}
    </span>
  );

  return (
    <PageHeader
      title={titleNode}
      actions={actions}
      showSidebarTrigger={false}
    />
  );
}
