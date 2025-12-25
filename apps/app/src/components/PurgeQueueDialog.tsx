import { useEffect, useState } from "react";

import { AlertTriangle, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alertDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { usePurgeQueue } from "@/hooks/queries/useRabbitMQ";
import { useToast } from "@/hooks/ui/useToast";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

interface PurgeQueueDialogProps {
  queueName: string;
  messageCount: number;
  vhost?: string | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const PurgeQueueDialog = ({
  queueName,
  messageCount,
  vhost: vhostProp,
  trigger,
  onSuccess,
}: PurgeQueueDialogProps) => {
  const [open, setOpen] = useState(false);
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { workspace } = useWorkspace();
  const { toast } = useToast();

  const purgeQueueMutation = usePurgeQueue();

  // Use prop vhost if provided, otherwise use context vhost, fallback to "/"
  const vhost = vhostProp ?? selectedVHost ?? "/";

  // Handle success/error
  useEffect(() => {
    if (purgeQueueMutation.isSuccess) {
      toast({
        title: "Queue Purged Successfully",
        description: `All messages in queue "${queueName}" have been purged`,
        variant: "default",
      });

      setOpen(false);
      onSuccess?.();
    }
    if (purgeQueueMutation.isError) {
      toast({
        title: "Failed to Purge Queue",
        description:
          purgeQueueMutation.error?.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }, [
    purgeQueueMutation.isSuccess,
    purgeQueueMutation.isError,
    purgeQueueMutation.error,
  ]);

  const handlePurge = () => {
    if (!selectedServerId) {
      toast({
        title: "Error",
        description: "No server selected",
        variant: "destructive",
      });
      return;
    }
    if (!workspace?.id) {
      toast({
        title: "Error",
        description: "No workspace selected",
        variant: "destructive",
      });
      return;
    }
    purgeQueueMutation.mutate({
      serverId: selectedServerId,
      workspaceId: workspace.id,
      queueName,
      vhost: encodeURIComponent(vhost),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Purge
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Purge Queue "{queueName}"?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              <strong>⚠️ This action cannot be undone!</strong>
            </div>
            <div>
              You are about to permanently delete all messages from the queue:
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-medium">{queueName}</span>
                {messageCount > 0 && (
                  <Badge variant="secondary">
                    {messageCount.toLocaleString()} messages
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {messageCount > 0
                ? `All ${messageCount.toLocaleString()} messages in this queue will be permanently deleted.`
                : "All messages in this queue will be permanently deleted."}{" "}
              This operation will:
            </div>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Remove all pending messages</li>
              <li>Clear both ready and unacknowledged messages</li>
              <li>Reset the queue message count to zero</li>
              <li>Cannot be reversed once executed</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 text-blue-600 mt-0.5">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <strong>Note:</strong> Queue purging is an asynchronous
                  operation. The message count may take a few moments to update
                  in the interface after the purge is initiated.
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePurge}
            disabled={purgeQueueMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {purgeQueueMutation.isPending ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Purging...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Yes, Purge Queue
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
