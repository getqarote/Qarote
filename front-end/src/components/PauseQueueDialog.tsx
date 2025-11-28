import { useState } from "react";

import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useServerContext } from "@/contexts/ServerContext";

import { usePauseQueue, useResumeQueue } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";

interface PauseQueueDialogProps {
  queueName: string;
  isPaused?: boolean;
  consumerCount: number;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function PauseQueueDialog({
  queueName,
  isPaused = false,
  consumerCount,
  onSuccess,
  trigger,
}: PauseQueueDialogProps) {
  const [open, setOpen] = useState(false);
  const { selectedServerId } = useServerContext();
  const { toast } = useToast();
  const pauseQueueMutation = usePauseQueue();
  const resumeQueueMutation = useResumeQueue();

  const handlePauseQueue = async () => {
    if (!selectedServerId) return;

    try {
      const result = await pauseQueueMutation.mutateAsync({
        serverId: selectedServerId,
        queueName,
      });

      toast({
        title: "Success",
        description: result.message,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to pause queue",
        variant: "destructive",
      });
    }
  };

  const handleResumeQueue = async () => {
    if (!selectedServerId) return;

    try {
      const result = await resumeQueueMutation.mutateAsync({
        serverId: selectedServerId,
        queueName,
      });

      toast({
        title: "Success",
        description: result.message,
      });

      if (result.note) {
        // Show additional info about manual consumer reconnection
        setTimeout(() => {
          toast({
            title: "Note",
            description: result.note,
            variant: "default",
          });
        }, 2000);
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to resume queue",
        variant: "destructive",
      });
    }
  };

  const isLoading =
    pauseQueueMutation.isPending || resumeQueueMutation.isPending;

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className={`flex items-center gap-2 ${
        isPaused
          ? "text-green-600 hover:text-green-700"
          : "text-yellow-600 hover:text-yellow-700"
      }`}
    >
      {isPaused ? (
        <>
          <Play className="w-4 h-4" />
          Resume Queue
        </>
      ) : (
        <>
          <Pause className="w-4 h-4" />
          Pause Queue
        </>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isPaused ? "Resume Queue" : "Pause Queue"}</DialogTitle>
          <DialogDescription>
            {isPaused ? (
              <>
                Are you sure you want to resume the queue "{queueName}"?
                <br />
                <strong>AMQP Resume:</strong> This will cancel the blocking
                consumer and allow normal message processing to continue.
              </>
            ) : (
              <>
                Are you sure you want to pause the queue "{queueName}"?
                <br />
                <strong>AMQP Pause:</strong> This will create a high-priority
                blocking consumer that will prevent message processing without
                affecting existing consumers.
                {consumerCount > 0 && (
                  <span className="text-sm text-muted-foreground block mt-2">
                    Current consumers: {consumerCount}
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={isPaused ? "default" : "secondary"}
            onClick={isPaused ? handleResumeQueue : handlePauseQueue}
            disabled={isLoading}
            className={"btn-primary text-white"}
          >
            {isLoading
              ? `${isPaused ? "Resuming" : "Pausing"}...`
              : `${isPaused ? "Resume" : "Pause"} Queue`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
