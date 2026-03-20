import { useTranslation } from "react-i18next";

import { AddQueueButton } from "@/components/AddQueueButton";
import { AddSendMessageButton } from "@/components/AddSendMessageButton";
import { PageHeader } from "@/components/ui/PageHeader";

interface QueueHeaderProps {
  selectedServerId: string;
  queueCount: number;
  workspaceLoading: boolean;
  canAddQueue: boolean;
  canSendMessages: boolean;
  isAdmin?: boolean;
  onAddQueueClick?: () => void;
  onSendMessageClick?: () => void;
  onRefetch?: () => void;
}

export function QueueHeader({
  selectedServerId,
  isAdmin,
  onRefetch,
}: QueueHeaderProps) {
  const { t } = useTranslation("queues");
  const actions = isAdmin ? (
    <>
      <AddSendMessageButton serverId={selectedServerId} onSuccess={onRefetch} />
      <AddQueueButton serverId={selectedServerId} onSuccess={onRefetch} />
    </>
  ) : null;

  return (
    <PageHeader
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      actions={actions}
      showSidebarTrigger={false}
    />
  );
}
