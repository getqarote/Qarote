import { useState } from "react";
import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import { qToast } from "@/lib/qToast";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useServerContext } from "@/contexts/ServerContext";
import { useVHostContext } from "@/contexts/VHostContextDefinition";

import { usePurgeQueue } from "@/hooks/queries/useRabbitMQ";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

interface PurgeQueueDialogProps {
  queueName: string;
  messageCount: number;
  vhost?: string | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  /** Optional controlled mode — when provided, the parent owns open state and
   *  no trigger is rendered (used as the soft "Purge instead" action). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PurgeQueueDialog = ({
  queueName,
  messageCount,
  vhost: vhostProp,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: PurgeQueueDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setInternalOpen;
  const { selectedServerId } = useServerContext();
  const { selectedVHost } = useVHostContext();
  const { workspace } = useWorkspace();
  const { t } = useTranslation("queues");

  const purgeQueueMutation = usePurgeQueue();

  // Use prop vhost if provided, otherwise use context vhost, fallback to "/"
  const vhost = vhostProp ?? selectedVHost ?? "/";

  // Awaited so ConfirmDialog closes only after the purge resolves; on success
  // we fire the result qToast (the dialog itself never toasts). The thrown
  // error is caught here and surfaced — ConfirmDialog keeps the dialog open.
  const handlePurge = async () => {
    // Fail fast on missing context — throwing keeps ConfirmDialog open (it only
    // closes when onConfirm resolves) so the user can retry once context loads.
    if (!selectedServerId) {
      toast.error(t("toast.error"), { description: t("purge.noServer") });
      throw new Error("no server");
    }
    if (!workspace?.id) {
      toast.error(t("toast.error"), { description: t("purge.noWorkspace") });
      throw new Error("no workspace");
    }
    try {
      await purgeQueueMutation.mutateAsync({
        serverId: selectedServerId,
        workspaceId: workspace.id,
        queueName,
        vhost: encodeURIComponent(vhost),
      });
      qToast({
        severity: "success",
        title: t("purge.successTitle"),
        msg: t("purge.successDescription", { queueName }),
      });
      onSuccess?.();
    } catch (error) {
      toast.error(t("purge.errorTitle"), {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
      // Re-throw so ConfirmDialog keeps the dialog open on a failed purge.
      throw error;
    }
  };

  return (
    <>
      {/* In controlled mode the parent owns open state — render no trigger. */}
      {isControlled ? null : trigger ? (
        <span
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {trigger}
        </span>
      ) : (
        <Button
          size="sm"
          variant="destructive-outline"
          className="rounded-none"
          onClick={() => setOpen(true)}
        >
          {t("purge.trigger")}
        </Button>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title={t("purge.title", { queueName })}
        warn={{ tone: "danger", message: t("purge.cannotBeUndone") }}
        body={
          <div className="space-y-3">
            <div>{t("purge.description")}</div>
            <div className="p-3 bg-muted rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-medium font-mono">{queueName}</span>
                {messageCount > 0 && (
                  <Badge variant="secondary">
                    {t("purge.messagesCount", {
                      count: messageCount.toLocaleString(),
                    })}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              {messageCount > 0
                ? t("purge.allMessagesDeleted", {
                    count: messageCount.toLocaleString(),
                  })
                : t("purge.allMessagesDeletedEmpty")}{" "}
              {t("purge.operationWill")}
            </div>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("purge.removeAllPending")}</li>
              <li>{t("purge.clearReadyAndUnacked")}</li>
              <li>{t("purge.resetCount")}</li>
              <li>{t("purge.cannotBeReversed")}</li>
            </ul>
          </div>
        }
        confirmLabel={t("purge.confirm")}
        pendingLabel={t("purge.purging")}
        cancelLabel={t("cancel")}
        isPending={purgeQueueMutation.isPending}
        onConfirm={handlePurge}
      />
    </>
  );
};
