import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Send, Plus, Trash2 } from "lucide-react";
import { PurgeQueueDialog } from "@/components/PurgeQueueDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { AddQueueForm } from "@/components/AddQueueForm";

interface QueueHeaderProps {
  queueName: string;
  selectedServerId: string;
  messageCount: number;
  onNavigateBack: () => void;
  onRefetch: () => void;
}

export function QueueHeader({
  queueName,
  selectedServerId,
  messageCount,
  onNavigateBack,
  onRefetch,
}: QueueHeaderProps) {
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
        <SendMessageDialog
          serverId={selectedServerId}
          defaultRoutingKey={queueName}
          trigger={
            <Button variant="outline" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Message
            </Button>
          }
        />
        <AddQueueForm
          serverId={selectedServerId}
          trigger={
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Queue
            </Button>
          }
        />
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
    </div>
  );
}
