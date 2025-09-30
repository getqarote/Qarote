import { PageHeader } from "@/components/ui/PageHeader";
import { AddSendMessageButton } from "@/components/AddSendMessageButton";
import { AddQueueButton } from "@/components/AddQueueButton";

interface QueueHeaderProps {
  selectedServerId: string;
  queueCount: number;
  workspaceLoading: boolean;
  canAddQueue: boolean;
  canSendMessages: boolean;
  onAddQueueClick: () => void;
  onSendMessageClick: () => void;
  onRefetch?: () => void; // Callback to refresh queue data
}

export function QueueHeader({
  selectedServerId,
  onAddQueueClick,
  onSendMessageClick,
  onRefetch,
}: QueueHeaderProps) {
  const actions = (
    <>
      {/* Send Message Button with plan restrictions */}
      <AddSendMessageButton
        serverId={selectedServerId}
        onUpgradeClick={onSendMessageClick}
        onSuccess={onRefetch}
      />

      {/* Add Queue Button with plan restrictions */}
      <AddQueueButton
        serverId={selectedServerId}
        onUpgradeClick={onAddQueueClick}
        onSuccess={onRefetch}
      />
    </>
  );

  return (
    <PageHeader
      title="Queues"
      subtitle="Manage and monitor all queues across your clusters"
      actions={actions}
      showSidebarTrigger={false}
    />
  );
}
