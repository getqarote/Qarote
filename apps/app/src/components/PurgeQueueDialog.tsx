import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("queues");

  const purgeQueueMutation = usePurgeQueue();

  // Use prop vhost if provided, otherwise use context vhost, fallback to "/"
  const vhost = vhostProp ?? selectedVHost ?? "/";

  // Handle success/error
  useEffect(() => {
    if (purgeQueueMutation.isSuccess) {
      toast({
        title: t("purge.successTitle"),
        description: t("purge.successDescription", { queueName }),
        variant: "default",
      });

      setOpen(false);
      onSuccess?.();
    }
    if (purgeQueueMutation.isError) {
      toast({
        title: t("purge.errorTitle"),
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
        title: t("toast.error"),
        description: t("purge.noServer"),
        variant: "destructive",
      });
      return;
    }
    if (!workspace?.id) {
      toast({
        title: t("toast.error"),
        description: t("purge.noWorkspace"),
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
            variant="destructive-outline"
            className="rounded-none"
          >
            {t("purge.trigger")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("purge.title", { queueName })}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              <strong>⚠️ {t("purge.cannotBeUndone")}</strong>
            </div>
            <div>{t("purge.description")}</div>
            <div className="p-3 bg-muted rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-medium">{queueName}</span>
                {messageCount > 0 && (
                  <Badge variant="secondary">
                    {t("purge.messagesCount", {
                      count: messageCount.toLocaleString(),
                    })}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {messageCount > 0
                ? t("purge.allMessagesDeleted", {
                    count: messageCount.toLocaleString(),
                  })
                : t("purge.allMessagesDeletedEmpty")}{" "}
              {t("purge.operationWill")}
            </div>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>{t("purge.removeAllPending")}</li>
              <li>{t("purge.clearReadyAndUnacked")}</li>
              <li>{t("purge.resetCount")}</li>
              <li>{t("purge.cannotBeReversed")}</li>
            </ul>
            <div className="mt-3 p-3 bg-info-muted border border-info/30 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 text-info mt-0.5">ℹ️</div>
                <div className="text-sm text-info">
                  <strong>Note:</strong> {t("purge.note")}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none">
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePurge}
            disabled={purgeQueueMutation.isPending}
            className="border border-destructive/30 bg-background text-destructive hover:bg-destructive/10 hover:border-destructive/50 rounded-none"
          >
            {purgeQueueMutation.isPending
              ? t("purge.purging")
              : t("purge.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
