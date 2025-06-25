import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Send, Plus, Trash2, Lock } from "lucide-react";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { AddQueueForm } from "@/components/AddQueueForm";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  canUserAddQueue,
  canUserSendMessagesWithCount,
} from "@/lib/plans/planUtils";
import { useState } from "react";
import PlanUpgradeModal from "@/components/plans/PlanUpgradeModal";

interface QueueHeaderProps {
  queueName: string;
  selectedServerId: string;
  messageCount: number;
  monthlyMessageCount: number;
  onNavigateBack: () => void;
  onRefetch: () => void;
}

export function QueueHeader({
  queueName,
  selectedServerId,
  messageCount,
  monthlyMessageCount,
  onNavigateBack,
  onRefetch,
}: QueueHeaderProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { workspacePlan, isLoading: workspaceLoading } = useWorkspace();

  // Use the actual workspace plan from context with message count restrictions
  const canAddQueue = canUserAddQueue(workspacePlan);
  const canSendMessages = workspaceLoading
    ? false
    : canUserSendMessagesWithCount(workspacePlan, monthlyMessageCount);

  const handleAddQueueClick = () => {
    if (!canAddQueue) {
      setShowUpgradeModal(true);
    }
  };

  const handleSendMessageClick = () => {
    if (!canSendMessages) {
      setShowUpgradeModal(true);
    }
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queues
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {queueName}
          </h1>
          <p className="text-gray-600 mt-1">Queue details and management</p>
        </div>
      </div>
      <div className="flex gap-3">
        {/* Send Message Button with plan restrictions */}
        {canSendMessages ? (
          <SendMessageDialog
            serverId={selectedServerId}
            queueName={queueName}
            mode="queue"
            onSuccess={onRefetch}
            trigger={
              <Button variant="outline" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            }
          />
        ) : (
          <Button
            onClick={handleSendMessageClick}
            disabled={true}
            variant="outline"
            className="flex items-center gap-2 opacity-60 cursor-not-allowed"
            title={
              workspacePlan === "FREE"
                ? "Upgrade to send messages"
                : workspacePlan === "FREELANCE"
                  ? `You've reached your monthly message limit (${monthlyMessageCount}/100). Upgrade to send more messages.`
                  : workspacePlan === "STARTUP"
                    ? `You've reached your monthly message limit (${monthlyMessageCount}/1000). Upgrade to send more messages.`
                    : "Upgrade to send messages"
            }
          >
            <Lock className="w-4 h-4" />
            Send Message
            <span
              className={`ml-1 px-2 py-0.5 text-white text-xs rounded-full font-bold ${
                workspacePlan === "FREE"
                  ? "bg-orange-500"
                  : workspacePlan === "FREELANCE"
                    ? "bg-blue-500"
                    : workspacePlan === "STARTUP"
                      ? "bg-purple-500"
                      : "bg-orange-500"
              }`}
            >
              {workspacePlan === "FREE"
                ? "Pro"
                : workspacePlan === "FREELANCE"
                  ? `${monthlyMessageCount}/100`
                  : workspacePlan === "STARTUP"
                    ? `${monthlyMessageCount}/1000`
                    : "Pro"}
            </span>
          </Button>
        )}

        {/* Add Queue Button with plan restrictions */}
        {canAddQueue ? (
          <AddQueueForm
            serverId={selectedServerId}
            onSuccess={onRefetch}
            trigger={
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Queue
              </Button>
            }
          />
        ) : (
          <Button
            onClick={handleAddQueueClick}
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
      </div>

      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="queue management"
        currentPlan={workspacePlan}
      />
    </div>
  );
}
