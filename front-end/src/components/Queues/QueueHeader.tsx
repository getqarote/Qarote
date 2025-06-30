import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddSendMessageButton } from "@/components/AddSendMessageButton";
import { AddQueueButton } from "@/components/AddQueueButton";
import { WorkspacePlan } from "@/types/plans";

interface QueueHeaderProps {
  selectedServerId: string;
  workspacePlan: WorkspacePlan;
  queueCount: number;
  monthlyMessageCount: number;
  workspaceLoading: boolean;
  canAddQueue: boolean;
  canSendMessages: boolean;
  onAddQueueClick: () => void;
  onSendMessageClick: () => void;
  onRefetch?: () => void; // Callback to refresh queue data
}

export function QueueHeader({
  selectedServerId,
  workspacePlan,
  queueCount,
  monthlyMessageCount,
  workspaceLoading,
  canAddQueue,
  canSendMessages,
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
      title="Queue Management"
      subtitle="Manage and monitor all queues across your clusters"
      actions={actions}
      showSidebarTrigger={false}
    />
  );
}
