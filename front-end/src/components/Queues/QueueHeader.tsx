import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { AddQueueForm } from "@/components/AddQueueForm";
import { MessageSquare, Plus, Lock } from "lucide-react";
import { WorkspacePlan } from "@/lib/plans/planUtils";

interface QueueHeaderProps {
  selectedServerId: string;
  workspacePlan: WorkspacePlan;
  canAddQueue: boolean;
  canSendMessages: boolean;
  onAddQueueClick: () => void;
  onSendMessageClick: () => void;
}

export function QueueHeader({
  selectedServerId,
  canAddQueue,
  canSendMessages,
  onAddQueueClick,
  onSendMessageClick,
}: QueueHeaderProps) {
  const actions = (
    <>
      {/* Send Message Button with plan restrictions */}
      {canSendMessages ? (
        <SendMessageDialog
          serverId={selectedServerId}
          trigger={
            <Button variant="outline" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Send Message
            </Button>
          }
        />
      ) : (
        <Button
          onClick={onSendMessageClick}
          disabled={true}
          variant="outline"
          className="flex items-center gap-2 opacity-60 cursor-not-allowed"
          title="Upgrade to send messages"
        >
          <Lock className="w-4 h-4" />
          Send Message
          <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
            Pro
          </span>
        </Button>
      )}

      {/* Add Queue Button with plan restrictions */}
      {canAddQueue ? (
        <AddQueueForm
          serverId={selectedServerId}
          trigger={
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Queue
            </Button>
          }
        />
      ) : (
        <Button
          onClick={onAddQueueClick}
          disabled={true}
          className="bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 flex items-center gap-2"
          title="Upgrade to add queues"
        >
          <Lock className="w-4 h-4" />
          Add Queue
          <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full font-bold">
            Pro
          </span>
        </Button>
      )}
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
