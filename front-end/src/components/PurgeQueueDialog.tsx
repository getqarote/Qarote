import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useServerContext } from "@/contexts/ServerContext";
import { useUser } from "@/hooks/useUser";
import { queryKeys } from "@/hooks/useApi";

interface PurgeQueueDialogProps {
  queueName: string;
  messageCount: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const PurgeQueueDialog = ({
  queueName,
  messageCount,
  trigger,
  onSuccess,
}: PurgeQueueDialogProps) => {
  const [open, setOpen] = useState(false);
  const { selectedServerId } = useServerContext();
  const { workspace } = useUser();
  const { toast } = useToast();

  const purgeQueueMutation = useMutation({
    mutationFn: async () => {
      if (!selectedServerId) {
        throw new Error("No server selected");
      }
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }
      return apiClient.purgeQueue(selectedServerId, queueName, workspace.id);
    },
    onSuccess: async (data) => {
      toast({
        title: "Queue Purged Successfully",
        description:
          data.purged === -1
            ? `All messages in queue "${queueName}" have been purged`
            : `${data.purged} messages were purged from queue "${queueName}"`,
        variant: "default",
      });

      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to Purge Queue",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handlePurge = () => {
    purgeQueueMutation.mutate();
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
