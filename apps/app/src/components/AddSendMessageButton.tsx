import { useTranslation } from "react-i18next";

import { SendMessageDialog } from "@/components/SendMessageDialog";
import { Button } from "@/components/ui/button";

interface AddSendMessageButtonProps {
  serverId: string;
  onSuccess?: () => void;
}

export const AddSendMessageButton = ({
  serverId,
  onSuccess,
}: AddSendMessageButtonProps) => {
  const { t } = useTranslation("queues");

  return (
    <SendMessageDialog
      serverId={serverId}
      mode="exchange"
      onSuccess={onSuccess}
      trigger={<Button className="btn-primary">{t("sendMessage")}</Button>}
    />
  );
};
